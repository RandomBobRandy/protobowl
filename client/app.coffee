#= require modernizr.js
#= require bootstrap.js
#= require plugins.coffee
#= require annotations.coffee
#= require buttons.coffee
#= require offline.coffee
#= require render.coffee
#= require time.coffee

sock = io.connect()
# console.timeEnd("from here")
# console.time('connect')

connected = -> sock? and sock.socket.connected

class QuizPlayerSlave extends QuizPlayer
	# encapsulate is such a boring word, well actually, it's pretty cool
	# but you should be allowed to envelop actions like captain kirk 
	# does to a mountain.
	envelop_action: (name) ->
		master_action = this[name]
		this[name] = (data, callback) ->
			if connected()
				sock.emit(name, data, callback)
			else
				master_action.call(this, data, callback)

	constructor: (room, id) ->
		super(room, id)
		blacklist = ['envelop_action']
		@envelop_action name for name, method of this when typeof method is 'function' and name not in blacklist


class QuizRoomSlave extends QuizRoom
	# dont know what to change
	emit: (name, data) ->
		# console.log 'yaaaaaaaaaaaaaaaaaayyy?', name, data
		@__listeners[name](data)

	constructor: (name) ->
		super(name)
		@__listeners = {}


room = new QuizRoomSlave()
me = new QuizPlayerSlave(room, 'temporary')

sock.on 'connect', ->
	# console.timeEnd('connect')
	# $('.chatbtn').disable(false)
	$('.actionbar button').disable false
	$('.timer').removeClass 'disabled'
	$('.disconnect-notice').slideUp()
	# implemented in SocketQuizPlayer rather than QuizPlayer
	# actually just new skeleeton method in place
	me.disco { old_socket: localStorage.old_socket }


sock.on 'disconnect', ->
	room.attempt = null if room.attempt?.user isnt me.id # get rid of any buzzes
	line = $('<div>').addClass 'well'
	line.append $('<p>').append("You were ", $('<span class="label label-important">').text("disconnected"), 
			" from the server for some reason. ", $('<em>').text(new Date))
	line.append $('<p>').append("This may be due to a drop in the network 
			connectivity or a malfunction in the server. The client will automatically 
			attempt to reconnect to the server and in the mean time, the app has automatically transitioned
			into <b>offline mode</b>. You can continue playing alone with a limited offline set
			of questions without interruption. However, you might want to try <a href=''>reloading</a>.")
	addImportant $('<div>').addClass('log disconnect-notice').append(line)
	# room.emit 'init_offline', 'yay' #obviously server wont pay attention to that
	# renderState()



# look at all these one liner events!
listen = (name, fn) ->
	sock.on name, fn
	room.__listeners[name] = fn

# probably should figure out some more elegant way to do things, but then again
# these things hardly actually need to be frequently added - it's mostly hacks
listen 'echo', (data, fn) -> fn 'alive'
listen 'application_update', -> applicationCache.update() if applicationCache?
listen 'application_force_update', -> $('#update').slideDown()
listen 'redirect', (url) -> window.location = url
listen 'alert', (text) -> window.alert text
listen 'chat', (data) -> chatAnnotation data
listen 'log', (data) -> verbAnnotation data
listen 'sync', (data) -> synchronize data

listen 'joined', (data) ->
	me.id = data.id
	me.name = data.name
	$('#username').val me.name
	$('#username').disable false

sync_offsets = []
latency_log = []


synchronize = (data) ->
	blacklist = ['real_time', 'users']
	
	sync_offsets.push +new Date - data.real_time
	compute_sync_offset()
	
	difflist = []
	difflist.push(attr) for attr, val of data when val isnt room[attr]
	
	room[attr] = val for attr, val of data when attr not in blacklist

	if 'timing' of data or room.__last_rate isnt room.rate
		cumsum = (list, rate) ->
			sum = 0 #start nonzero, allow pause before rendering
			for num in [5].concat(list).slice(0, -1)
				sum += Math.round(num) * rate #always round!
		room.cumulative = cumsum room.timing, room.rate
		room.__last_rate = room.rate

	if  'users' of data
		user_blacklist = ['id']
		for user in data.users
			# user.room = room.name
			if user.id is me.id
				console.log "it's me, mario!"
				room.users[user.id] = me
			else
				unless user.id of room.users
					room.users[user.id] = new QuizPlayer(room, user.id)
				for attr, val of user when attr not in user_blacklist
					room.users[user.id][attr] = val

	if 'difficulties' of data
		renderParameters()

	renderUpdate()

	if 'time_freeze' in difflist # includes buzzes
		variable = (if room.attempt then 'starts' else 'stops')
		del = room.time_freeze - room.begin_time
		i = 0
		i++ while del > room.cumulative[i]
		starts = ($('.bundle.active').data(variable) || [])
		starts.push(i - 1) if (i - 1) not in starts
		$('.bundle.active').data(variable, starts)

		updateInlineSymbols()

	if 'users' of data
		renderUsers()
	
	renderPartial()

# TODO: move this over to QuizPlayer class
computeScore = (user) ->
	return 0 if !user

	CORRECT = 10
	EARLY = 15
	INTERRUPT = -5

	return user.early * EARLY + (user.correct - user.early) * CORRECT + user.interrupts * INTERRUPT


Avg = (list) -> Sum(list) / list.length
Sum = (list) -> s = 0; s += item for item in list; s
StDev = (list) -> mu = Avg(list); Math.sqrt Avg((item - mu) * (item - mu) for item in list)


compute_sync_offset = ->
	#here is the rather complicated code to calculate
	#then offsets of the time synchronization stuff
	#it's totally not necessary to do this, but whatever
	#it might make the stuff work better when on an
	#apple iOS device where screen drags pause the
	#recieving of sockets/xhrs meaning that the sync
	#might be artificially inflated, so this could
	#counteract that. since it's all numerical math
	#hopefully it'll be fast even if sync_offsets becomes
	#really really huge

	
	sync_offsets = sync_offsets.slice(-20)

	thresh = Avg sync_offsets
	below = (item for item in sync_offsets when item <= thresh)
	sync_offset = Avg(below)
	# console.log 'frst iter', below
	thresh = Avg below
	below = (item for item in sync_offsets when item <= thresh)
	room.sync_offset = Avg(below)

	# console.log 'sec iter', below
	$('#sync_offset').text(room.sync_offset.toFixed(1) + '/' + StDev(below).toFixed(1) + '/' + StDev(sync_offsets).toFixed(1))

testLatency = ->
	return unless connected()
	initialTime = +new Date
	sock.emit 'echo', {}, (firstServerTime) ->
		recieveTime = +new Date
		sock.emit 'echo', {}, (secondServerTime) ->
			secondTime = +new Date
			CSC1 = recieveTime - initialTime
			CSC2 = secondTime - recieveTime
			SCS1 = secondServerTime - firstServerTime

			sync_offsets.push recieveTime - firstServerTime
			sync_offsets.push secondTime - secondServerTime

			latency_log.push CSC1
			latency_log.push SCS1
			latency_log.push CSC2
			# console.log CSC1, SCS1, CSC2

			compute_sync_offset()

			if latency_log.length > 0
				$('#latency').text(Avg(latency_log).toFixed(1) + "/" + StDev(latency_log).toFixed(1) + " (#{latency_log.length})")


setTimeout ->
	testLatency()
	setInterval -> 
		testLatency()
	, 30 * 1000
, 2000