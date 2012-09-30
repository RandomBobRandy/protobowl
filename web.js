var Cookies, QuizRoom, app, checkAnswer, clearInactive, count, crypto, cumsum, default_distribution, error_question, express, filterQuestions, fisher_yates, fs, full_journal_sync, http, io, journal, journal_config, journal_queue, listProps, log, log_config, names, parseCookie, partial_journal, port, process_journal_queue, questions, reaped, remote, restore_journal, rooms, scheduledUpdate, sha1, syllables, updateCache, uptime_begin, url, watcher,
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
  __slice = [].slice;

express = require('express');

fs = require('fs');

checkAnswer = require('./lib/answerparse').checkAnswer;

syllables = require('./lib/syllable').syllables;

parseCookie = require('express/node_modules/connect').utils.parseCookie;

crypto = require('crypto');

app = express.createServer();

io = require('socket.io').listen(app);

url = require('url');

Cookies = require('cookies');

app.use(require('less-middleware')({
  src: __dirname
}));

app.use(express.favicon(__dirname + '/img/favicon.ico'));

names = require('./lib/names');

try {
  remote = require('./lib/remote');
} catch (err) {
  questions = [];
  count = 0;
  fs.readFile('sample.txt', 'utf8', function(err, data) {
    var line;
    if (err) {
      throw err;
    }
    return questions = (function() {
      var _i, _len, _ref, _results;
      _ref = data.split("\n");
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        line = _ref[_i];
        _results.push(JSON.parse(line));
      }
      return _results;
    })();
  });
  listProps = function(prop) {
    var p, propmap, q, _i, _len;
    propmap = {};
    for (_i = 0, _len = questions.length; _i < _len; _i++) {
      q = questions[_i];
      propmap[q[prop]] = 1;
    }
    return (function() {
      var _results;
      _results = [];
      for (p in propmap) {
        _results.push(p);
      }
      return _results;
    })();
  };
  filterQuestions = function(diff, cat) {
    return questions.filter(function(q) {
      if (diff && q.difficulty !== diff) {
        return false;
      }
      if (cat && q.category !== cat) {
        return false;
      }
      return true;
    });
  };
  remote = {
    countQuestions: function(diff, cat, cb) {
      return cb(filterQuestions(diff, cat).length, 42);
    },
    getAtIndex: function(diff, cat, index, cb) {
      return cb(filterQuestions(diff, cat)[index]);
    },
    getCategories: function() {
      return listProps('category');
    },
    getDifficulties: function() {
      return listProps('difficulty');
    }
  };
}

app.use(function(req, res, next) {
  var cookies, expire_date, seed;
  cookies = new Cookies(req, res);
  if (!cookies.get('protocookie')) {
    seed = "proto" + Math.random() + "bowl" + Math.random() + "client" + req.headers['user-agent'];
    expire_date = new Date();
    expire_date.setFullYear(expire_date.getFullYear() + 2);
    cookies.set('protocookie', sha1(seed), {
      expires: expire_date,
      httpOnly: false,
      signed: false,
      secure: false,
      path: '/'
    });
  }
  return next();
});

app.use(express["static"](__dirname));

if (app.settings.env === 'development') {
  scheduledUpdate = null;
  updateCache = function() {
    return fs.readFile(__dirname + '/offline.appcache', 'utf8', function(err, data) {
      if (err) {
        throw err;
      }
      data = data.replace(/INSERT_DATE.*?\n/, 'INSERT_DATE ' + (new Date).toString() + "\n");
      return fs.writeFile(__dirname + '/offline.appcache', data, function(err) {
        if (err) {
          throw err;
        }
        io.sockets.emit('application_update', +(new Date));
        return scheduledUpdate = null;
      });
    });
  };
  watcher = function(event, filename) {
    if ((filename === "offline.appcache" || filename === "web.js" || filename === "web.coffee" || filename === "remote.coffee" || filename === "remote.js") || /\.css$/.test(filename)) {
      return;
    }
    console.log("changed file", filename);
    if (!scheduledUpdate) {
      return scheduledUpdate = setTimeout(updateCache, 500);
    }
  };
  fs.watch(__dirname, watcher);
  fs.watch(__dirname + "/lib", watcher);
  fs.watch(__dirname + "/less", watcher);
}

io.configure('production', function() {
  return io.set("log level", 0);
});

io.configure('development', function() {
  return io.set("log level", 2);
});

app.set('views', __dirname);

app.set('view options', {
  layout: false
});

error_question = {
  'category': '$0x40000',
  'difficulty': 'segmentation fault',
  'num': 'NaN',
  'tournament': 'Guru Meditation Cup',
  'question': 'This type of event occurs when the queried database returns an invalid question and is frequently indicative of a set of constraints which yields a null set. Certain manifestations of this kind of event lead to significant monetary loss and often result in large public relations campaigns to recover from the damaged brand valuation. This type of event is most common with computer software and hardware, and one way to diagnose this type of event when it happens on the bootstrapping phase of a computer operating system is by looking for the POST information. Kernel varieties of this event which are unrecoverable are referred to as namesake panics in the BSD/Mach hybrid microkernel which powers Mac OS X. The infamous Disk Operating System variety of this type of event is known for its primary color backdrop and continues to plague many of the contemporary descendents of DOS with code names such as Whistler, Longhorn and Chidori. For 10 points, name this event which happened right now.',
  'answer': 'error',
  'year': 1970,
  'round': '0x080483ba'
};

cumsum = function(list, rate) {
  var num, sum, _i, _len, _ref, _results;
  sum = 0;
  _ref = [5].concat(list).slice(0, -1);
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    num = _ref[_i];
    _results.push(sum += Math.round(num) * rate);
  }
  return _results;
};

fisher_yates = function(i) {
  var arr, j, _i, _ref, _results;
  if (i === 0) {
    return [];
  }
  arr = (function() {
    _results = [];
    for (var _i = 0; 0 <= i ? _i < i : _i > i; 0 <= i ? _i++ : _i--){ _results.push(_i); }
    return _results;
  }).apply(this);
  while (--i) {
    j = Math.floor(Math.random() * (i + 1));
    _ref = [arr[j], arr[i]], arr[i] = _ref[0], arr[j] = _ref[1];
  }
  return arr;
};

default_distribution = {
  "Fine Arts": 2,
  "Literature": 4,
  "History": 3,
  "Science": 3,
  "Trash": 1,
  "Geography": 1,
  "Mythology": 1,
  "Philosophy": 1,
  "Religion": 1,
  "Social Science": 1
};

QuizRoom = (function() {

  function QuizRoom(name) {
    this.name = name;
    this.answer_duration = 1000 * 5;
    this.time_offset = 0;
    this.rate = 1000 * 60 / 5 / 200;
    this.__timeout = -1;
    this.question_schedule = [];
    this.history = [];
    this.freeze();
    this.new_question();
    this.users = {};
    this.difficulty = '';
    this.category = '';
    this.distribution = default_distribution;
    this.max_buzz = null;
  }

  QuizRoom.prototype.reset_schedule = function() {
    var _this = this;
    return remote.countQuestions(this.difficulty, this.category, function(num) {
      if (num < 300) {
        return _this.question_schedule = fisher_yates(num);
      } else {
        return _this.question_schedule = [];
      }
    });
  };

  QuizRoom.prototype.get_question = function(cb) {
    var attemptQuestion, num_attempts,
      _this = this;
    num_attempts = 0;
    attemptQuestion = function() {
      num_attempts++;
      return remote.getQuestion(_this.difficulty, _this.category, function(question) {
        var _ref;
        if ((_ref = question._id.toString(), __indexOf.call(_this.history, _ref) >= 0) && num_attempts < 15) {
          return attemptQuestion();
        }
        _this.history.splice(100);
        _this.history.splice(0, 0, question._id.toString());
        return cb(question || error_question);
      });
    };
    return remote.countQuestions(this.difficulty, this.category, function(num, no_db) {
      var index;
      if (num < 300 || no_db === 42) {
        if (_this.question_schedule.length === 0) {
          _this.question_schedule = fisher_yates(num);
        }
        index = _this.question_schedule.shift();
        return remote.getAtIndex(_this.difficulty, _this.category, index, function(doc) {
          return cb(doc || error_question);
        });
      } else {
        return attemptQuestion();
      }
    });
  };

  QuizRoom.prototype.add_socket = function(id, socket) {
    var user;
    if (!(id in this.users)) {
      this.users[id] = {
        sockets: [],
        guesses: 0,
        interrupts: 0,
        early: 0,
        correct: 0,
        seen: 0,
        time_spent: 0,
        last_action: 0,
        times_buzzed: 0,
        show_typing: true,
        team: '',
        sounds: false
      };
      journal(this.name);
    }
    user = this.users[id];
    user.id = id;
    this.touch(id, true);
    if (__indexOf.call(user.sockets, socket) < 0) {
      return user.sockets.push(socket);
    }
  };

  QuizRoom.prototype.emit_user = function() {
    var args, id, s, sock, _i, _len, _ref, _results;
    id = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    if (id in this.users) {
      _ref = this.users[id].sockets;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        sock = _ref[_i];
        s = io.sockets.socket(sock);
        _results.push(s.emit.apply(s, args));
      }
      return _results;
    }
  };

  QuizRoom.prototype.touch = function(id, no_add_time) {
    var elapsed;
    if (!no_add_time) {
      elapsed = this.serverTime() - this.users[id].last_action;
      if (elapsed < 1000 * 60 * 10) {
        this.users[id].time_spent += elapsed;
      }
    }
    return this.users[id].last_action = this.serverTime();
  };

  QuizRoom.prototype.del_socket = function(id, socket) {
    var sock, user;
    user = this.users[id];
    if (user) {
      this.touch(id);
      user.sockets = (function() {
        var _i, _len, _ref, _results;
        _ref = user.sockets;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          sock = _ref[_i];
          if (sock !== socket) {
            _results.push(sock);
          }
        }
        return _results;
      })();
    }
    return journal(this.name);
  };

  QuizRoom.prototype.time = function() {
    if (this.time_freeze) {
      return this.time_freeze;
    } else {
      return this.serverTime() - this.time_offset;
    }
  };

  QuizRoom.prototype.serverTime = function() {
    return +(new Date);
  };

  QuizRoom.prototype.freeze = function() {
    return this.time_freeze = this.time();
  };

  QuizRoom.prototype.unfreeze = function() {
    if (this.time_freeze) {
      this.set_time(this.time_freeze);
      return this.time_freeze = 0;
    }
  };

  QuizRoom.prototype.set_time = function(ts) {
    return this.time_offset = new Date - ts;
  };

  QuizRoom.prototype.pause = function() {
    if (!(this.attempt || this.time() > this.end_time)) {
      return this.freeze();
    }
  };

  QuizRoom.prototype.unpause = function() {
    if (!this.attempt) {
      return this.unfreeze();
    }
  };

  QuizRoom.prototype.timeout = function(metric, time, callback) {
    var diff,
      _this = this;
    this.clear_timeout();
    diff = time - metric();
    if (diff < 0) {
      return callback();
    } else {
      return this.__timeout = setTimeout(function() {
        return _this.timeout(metric, time, callback);
      }, diff);
    }
  };

  QuizRoom.prototype.clear_timeout = function() {
    return clearTimeout(this.__timeout);
  };

  QuizRoom.prototype.new_question = function() {
    var _this = this;
    this.generating_question = true;
    return this.get_question(function(question) {
      var id, user, word, _ref;
      delete _this.generating_question;
      _this.attempt = null;
      _this.info = {
        category: question.category,
        difficulty: question.difficulty,
        tournament: question.tournament,
        num: question.num,
        year: question.year,
        round: question.round
      };
      _this.question = question.question.replace(/FTP/g, 'For 10 points').replace(/^\[.*?\]/, '').replace(/\n/g, ' ').replace(/\s+/g, ' ');
      _this.answer = question.answer.replace(/\<\w\w\>/g, '').replace(/\[\w\w\]/g, '');
      _this.qid = "pb" + _this.info.year + "-" + _this.info.num + "-" + _this.info.tournament.replace(/[^a-z0-9]+/ig, '-') + "---" + _this.answer.replace(/[^a-z0-9]+/ig, '-').slice(0, 20);
      _this.begin_time = _this.time();
      _this.timing = (function() {
        var _i, _len, _ref, _results;
        _ref = this.question.split(" ");
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          word = _ref[_i];
          _results.push(syllables(word) + 1);
        }
        return _results;
      }).call(_this);
      _this.set_speed(_this.rate);
      _ref = _this.users;
      for (id in _ref) {
        user = _ref[id];
        user.times_buzzed = 0;
        if (user.sockets.length > 0 && new Date - user.last_action < 1000 * 60 * 10) {
          user.seen++;
        }
      }
      return _this.sync(2);
    });
  };

  QuizRoom.prototype.set_speed = function(rate) {
    var done, duration, elapsed, new_duration, now, remainder;
    if (!rate) {
      return;
    }
    now = this.time();
    this.cumulative = cumsum(this.timing, this.rate);
    elapsed = now - this.begin_time;
    duration = this.cumulative[this.cumulative.length - 1];
    done = elapsed / duration;
    remainder = 0;
    if (done > 1) {
      remainder = elapsed - duration;
      done = 1;
    }
    this.rate = rate;
    this.cumulative = cumsum(this.timing, this.rate);
    new_duration = this.cumulative[this.cumulative.length - 1];
    this.begin_time = now - new_duration * done - remainder;
    return this.end_time = this.begin_time + new_duration + this.answer_duration;
  };

  QuizRoom.prototype.skip = function() {
    if (!this.attempt) {
      return this.new_question();
    }
  };

  QuizRoom.prototype.next = function() {
    if (this.time() > this.end_time - this.answer_duration && !this.generating_question) {
      if (!this.attempt) {
        return this.new_question();
      }
    }
  };

  QuizRoom.prototype.emit = function(name, data) {
    return io.sockets["in"](this.name).emit(name, data);
  };

  QuizRoom.prototype.finish = function() {
    return this.set_time(this.end_time);
  };

  QuizRoom.prototype.end_buzz = function(session) {
    var buzzed, do_prompt, id, pool, user, _ref, _ref1,
      _this = this;
    if (((_ref = this.attempt) != null ? _ref.session : void 0) !== session) {
      return;
    }
    this.touch(this.attempt.user);
    if (!this.attempt.prompt) {
      this.clear_timeout();
      this.attempt.done = true;
      this.attempt.correct = checkAnswer(this.attempt.text, this.answer, this.question);
      do_prompt = false;
      if (this.attempt.correct === 'prompt') {
        do_prompt = true;
        this.attempt.correct = false;
      }
      if (Math.random() > 0.99 && this.attempt.correct === false) {
        do_prompt = true;
      }
      log('buzz', [this.name, this.attempt.user + '-' + this.users[this.attempt.user].name, this.attempt.text, this.answer, this.attempt.correct]);
      if (do_prompt === true) {
        this.attempt.correct = "prompt";
        this.sync();
        this.attempt.prompt = true;
        this.attempt.done = false;
        this.attempt.realTime = this.serverTime();
        this.attempt.start = this.time();
        this.attempt.text = '';
        this.attempt.duration = 10 * 1000;
        io.sockets["in"](this.name).emit('log', {
          user: this.attempt.user,
          verb: "won the lottery, hooray! 1% of buzzes which would otherwise be deemed wrong are randomly selected to be prompted, that's because the user interface for prompts has been developed (and thus needs to be tested), but the answer checker algorithm isn't smart enough to actually give prompts."
        });
        this.timeout(this.serverTime, this.attempt.realTime + this.attempt.duration, function() {
          return _this.end_buzz(session);
        });
      }
      this.sync();
    } else {
      this.attempt.done = true;
      this.attempt.correct = checkAnswer(this.attempt.text, this.answer, this.question);
      if (this.attempt.correct === 'prompt') {
        this.attempt.correct = false;
      }
      this.sync();
    }
    if (this.attempt.done) {
      this.unfreeze();
      if (this.attempt.correct) {
        this.users[this.attempt.user].correct++;
        if (this.attempt.early) {
          this.users[this.attempt.user].early++;
        }
        this.finish();
      } else {
        if (this.attempt.interrupt) {
          this.users[this.attempt.user].interrupts++;
        }
        buzzed = 0;
        pool = 0;
        _ref1 = this.users;
        for (id in _ref1) {
          user = _ref1[id];
          if (id[0] !== "_") {
            if (user.sockets.length > 0 && (new Date - user.last_action) < 1000 * 60 * 10) {
              if (user.times_buzzed >= this.max_buzz && this.max_buzz) {
                buzzed++;
              }
              pool++;
            }
          }
        }
        if (this.max_buzz) {
          if (buzzed >= pool) {
            this.finish();
          }
        }
      }
      journal(this.name);
      this.attempt = null;
      return this.sync(1);
    }
  };

  QuizRoom.prototype.buzz = function(user, fn) {
    var early_index, session,
      _this = this;
    this.touch(user);
    if (this.max_buzz && this.users[user].times_buzzed >= this.max_buzz) {
      if (fn) {
        fn('THE BUZZES ARE TOO DAMN HIGH');
      }
      return io.sockets["in"](this.name).emit('log', {
        user: user,
        verb: 'has already buzzed'
      });
    } else if (this.attempt === null && this.time() <= this.end_time) {
      if (fn) {
        fn('http://www.whosawesome.com/');
      }
      session = Math.random().toString(36).slice(2);
      early_index = this.question.replace(/[^ \*]/g, '').indexOf('*');
      this.attempt = {
        user: user,
        realTime: this.serverTime(),
        start: this.time(),
        duration: 8 * 1000,
        session: session,
        text: '',
        early: early_index !== -1 && this.time() < this.begin_time + this.cumulative[early_index],
        interrupt: this.time() < this.end_time - this.answer_duration,
        done: false
      };
      this.users[user].times_buzzed++;
      this.users[user].guesses++;
      this.freeze();
      this.sync(1);
      return this.timeout(this.serverTime, this.attempt.realTime + this.attempt.duration, function() {
        return _this.end_buzz(session);
      });
    } else {
      io.sockets["in"](this.name).emit('log', {
        user: user,
        verb: 'lost the buzzer race'
      });
      if (fn) {
        return fn('THE GAME');
      }
    }
  };

  QuizRoom.prototype.guess = function(user, data) {
    var _ref;
    this.touch(user);
    if (((_ref = this.attempt) != null ? _ref.user : void 0) === user) {
      this.attempt.text = data.text;
      if (data.done) {
        return this.end_buzz(this.attempt.session);
      } else {
        return this.sync();
      }
    }
  };

  QuizRoom.prototype.sync = function(level) {
    var attr, blacklist, data, id, user, user_blacklist;
    if (level == null) {
      level = 0;
    }
    data = {
      real_time: +(new Date)
    };
    blacklist = ["question", "answer", "timing", "voting", "info", "cumulative", "users", "question_schedule", "history", "__timeout", "generating_question", "distribution"];
    user_blacklist = ["sockets"];
    for (attr in this) {
      if (typeof this[attr] !== 'function' && __indexOf.call(blacklist, attr) < 0) {
        data[attr] = this[attr];
      }
    }
    if (level >= 1) {
      data.users = (function() {
        var _results;
        _results = [];
        for (id in this.users) {
          if (!(!this.users[id].ninja)) {
            continue;
          }
          user = {};
          for (attr in this.users[id]) {
            if (__indexOf.call(user_blacklist, attr) < 0) {
              user[attr] = this.users[id][attr];
            }
          }
          user.online = this.users[id].sockets.length > 0;
          _results.push(user);
        }
        return _results;
      }).call(this);
    }
    if (level >= 2) {
      data.question = this.question;
      data.answer = this.answer;
      data.timing = this.timing;
      data.info = this.info;
    }
    if (level >= 3) {
      data.categories = remote.getCategories();
      data.difficulties = remote.getDifficulties();
      data.distribution = this.distribution;
    }
    return io.sockets["in"](this.name).emit('sync', data);
  };

  QuizRoom.prototype.journal_backup = function() {
    var attr, data, field, id, settings, user, user_blacklist, _i, _len;
    data = {};
    user_blacklist = ["sockets"];
    data.users = (function() {
      var _results;
      _results = [];
      for (id in this.users) {
        user = {};
        for (attr in this.users[id]) {
          if (__indexOf.call(user_blacklist, attr) < 0) {
            user[attr] = this.users[id][attr];
          }
        }
        _results.push(user);
      }
      return _results;
    }).call(this);
    settings = ["name", "difficulty", "category", "rate", "answer_duration", "max_buzz", "distribution"];
    for (_i = 0, _len = settings.length; _i < _len; _i++) {
      field = settings[_i];
      data[field] = this[field];
    }
    return data;
  };

  return QuizRoom;

})();

sha1 = function(text) {
  var hash;
  hash = crypto.createHash('sha1');
  hash.update(text);
  return hash.digest('hex');
};

journal_config = {
  host: 'localhost',
  port: 15865
};

log_config = {
  host: 'localhost',
  port: 18228
};

if (app.settings.env !== 'development') {
  log_config = remote.deploy.log;
  journal_config = remote.deploy.journal;
  console.log('set to deployment defaults');
}

http = require('http');

log = function(action, obj) {
  var req;
  if (app.settings.env === 'development') {
    return;
  }
  req = http.request(log_config, function() {});
  req.on('error', function() {
    return console.log("logging error");
  });
  req.write((+(new Date)) + ' ' + action + ' ' + JSON.stringify(obj) + '\n');
  return req.end();
};

log('server_restart', {});

journal_queue = {};

journal = function(name) {
  return journal_queue[name] = +(new Date);
};

process_journal_queue = function() {
  var first, room_names;
  room_names = Object.keys(journal_queue).sort(function(a, b) {
    return journal_queue[a] - journal_queue[b];
  });
  if (room_names.length === 0) {
    return;
  }
  first = room_names[0];
  delete journal_queue[first];
  if (first in rooms) {
    return partial_journal(first);
  } else {
    return console.log('processing', first);
  }
};

setInterval(process_journal_queue, 1000);

partial_journal = function(name) {
  var req;
  journal_config.path = '/journal';
  journal_config.method = 'POST';
  req = http.request(journal_config, function(res) {
    res.setEncoding('utf8');
    return res.on('data', function(chunk) {
      if (chunk === 'do_full_sync') {
        console.log('got trigger for doing a full journal sync');
        journal_queue = {};
        return full_journal_sync();
      }
    });
  });
  req.on('error', function() {});
  req.write(JSON.stringify(rooms[name].journal_backup()));
  return req.end();
};

full_journal_sync = function() {
  var backup, name, req, room;
  backup = (function() {
    var _results;
    _results = [];
    for (name in rooms) {
      room = rooms[name];
      _results.push(room.journal_backup());
    }
    return _results;
  })();
  journal_config.path = '/full_sync';
  journal_config.method = 'POST';
  req = http.request(journal_config, function(res) {
    return console.log("done full sync");
  });
  req.on('error', function() {
    return console.log("full sync error error");
  });
  req.write(JSON.stringify(backup));
  return req.end();
};

rooms = {};

restore_journal = function(callback) {
  var req;
  journal_config.path = '/retrieve';
  journal_config.method = 'GET';
  req = http.request(journal_config, function(res) {
    var packet;
    console.log('GOT JOURNAL RESPONSE');
    res.setEncoding('utf8');
    packet = '';
    res.on('data', function(chunk) {
      return packet += chunk;
    });
    return res.on('end', function() {
      var data, field, fields, id, json, name, room, user, _i, _j, _len, _len1, _ref;
      console.log("GOT DATA");
      json = JSON.parse(packet);
      fields = ["difficulty", "distribution", "category", "rate", "answer_duration", "max_buzz"];
      for (name in json) {
        data = json[name];
        if (!(name in rooms)) {
          console.log('restoring', name);
          rooms[name] = new QuizRoom(name);
          room = rooms[name];
          _ref = data.users;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            user = _ref[_i];
            id = user.id;
            room.users[id] = user;
            room.users[id].sockets = [];
          }
          for (_j = 0, _len1 = fields.length; _j < _len1; _j++) {
            field = fields[_j];
            room[field] = data[field];
          }
        }
      }
      console.log('restored journal');
      if (callback) {
        return callback();
      }
    });
  });
  req.on('error', function() {
    console.log("Journal not accessible. Starting with defaults.");
    if (callback) {
      return callback();
    }
  });
  return req.end();
};

io.sockets.on('connection', function(sock) {
  var config, cookie, existing_user, headers, is_god, is_ninja, publicID, r_name, room, room_name, user,
    _this = this;
  headers = sock.handshake.headers;
  if (!(headers.referer && headers.cookie)) {
    return sock.disconnect();
  }
  config = url.parse(headers.referer);
  if (config.host !== 'protobowl.com' && app.settings.env !== 'development') {
    console.log("Sending Upgrade Request", headers.referer);
    config.host = 'protobowl.com';
    sock.emit('application_update', +(new Date));
    sock.emit('redirect', url.format(config));
    sock.disconnect();
    return;
  }
  cookie = parseCookie(headers.cookie);
  if (!(cookie.protocookie && config.pathname)) {
    return sock.disconnect();
  }
  is_god = /god/.test(config.search);
  is_ninja = /ninja/.test(config.search);
  room_name = config.pathname.replace(/\//g, '');
  publicID = sha1(cookie.protocookie + room_name);
  if (is_ninja) {
    publicID = "__secret_ninja";
  }
  if (is_god) {
    publicID += "_god";
  }
  if (!rooms[room_name]) {
    rooms[room_name] = new QuizRoom(room_name);
  }
  room = rooms[room_name];
  existing_user = publicID in room.users;
  room.add_socket(publicID, sock.id);
  if (is_god) {
    for (r_name in rooms) {
      sock.join(r_name);
    }
  } else {
    sock.join(room_name);
  }
  user = room.users[publicID];
  if (is_ninja) {
    user.ninja = true;
    user.name = publicID;
  }
  user.name || (user.name = names.generateName());
  sock.emit('joined', {
    id: publicID,
    name: user.name
  });
  room.sync(3);
  if (!is_ninja) {
    room.emit('log', {
      user: publicID,
      verb: 'joined the room'
    });
  }
  if (new Date - uptime_begin < 1000 * 60 && existing_user) {
    sock.emit('log', {
      verb: 'The server has recently been restarted. Your scores may have been preserved in the journal (however, restoration is experimental and not necessarily reliable). The journal does not record the current question, chat messages, or current attempts, so you may need to manually advance a question. This may have been part of a server or client software update, or the result of an unexpected server crash. We apologize for any inconvienience this may have caused.'
    });
    sock.emit('application_update', +(new Date));
  }
  sock.on('join', function(data, fn) {
    sock.emit('application_update', +(new Date));
    sock.emit('log', {
      user: publicID,
      verb: 'is using an outdated (and incompatible) version of ProtoBowl'
    });
    return sock.disconnect();
  });
  sock.on('disco', function(data) {
    if (data.old_socket && io.sockets.socket(data.old_socket)) {
      return io.sockets.socket(data.old_socket).disconnect();
    }
  });
  sock.on('echo', function(data, callback) {
    return callback(+(new Date));
  });
  sock.on('rename', function(name) {
    room.users[publicID].name = name.slice(0, 140);
    room.touch(publicID);
    room.sync(1);
    return journal(room.name);
  });
  sock.on('skip', function(vote) {
    if (room && !room.attempt) {
      room.skip();
      return room.emit('log', {
        user: publicID,
        verb: 'skipped a question'
      });
    }
  });
  sock.on('finish', function(vote) {
    if (room && !room.attempt) {
      room.finish();
      return room.sync(1);
    }
  });
  sock.on('distribution', function(data) {
    room.distribution = data || default_distribution;
    return room.sync(3);
  });
  sock.on('next', function() {
    return room.next();
  });
  sock.on('pause', function(vote) {
    room.pause();
    return room.sync();
  });
  sock.on('unpause', function(vote) {
    room.unpause();
    return room.sync();
  });
  sock.on('difficulty', function(data) {
    room.difficulty = data;
    room.reset_schedule();
    room.sync();
    journal(room.name);
    log('difficulty', [room.name, publicID + '-' + room.users[publicID].name, room.difficulty]);
    return remote.countQuestions(room.difficulty, room.category, function(count) {
      return room.emit('log', {
        user: publicID,
        verb: 'set difficulty to ' + (data || 'everything') + ' (' + count + ' questions)'
      });
    });
  });
  sock.on('category', function(data) {
    room.category = data;
    room.reset_schedule();
    room.sync();
    journal(room.name);
    if (!data) {
      room.distribution = default_distribution;
    }
    log('category', [room.name, publicID + '-' + room.users[publicID].name, room.category]);
    if (data === "custom") {
      room.emit('log', {
        user: publicID,
        verb: 'enabled a custom category distribution'
      });
      return room.sync(3);
    } else {
      return remote.countQuestions(room.difficulty, room.category, function(count) {
        return room.emit('log', {
          user: publicID,
          verb: 'set category to ' + (data.toLowerCase() || 'potpourri') + ' (' + count + ' questions)'
        });
      });
    }
  });
  sock.on('max_buzz', function(data) {
    room.max_buzz = data;
    room.sync();
    return journal(room.name);
  });
  sock.on('team', function(data) {
    if (data) {
      room.emit('log', {
        user: publicID,
        verb: "switched to team " + data
      });
    } else {
      room.emit('log', {
        user: publicID,
        verb: "is playing as an individual"
      });
    }
    room.users[publicID].team = data;
    room.sync(2);
    return journal(room.name);
  });
  sock.on('show_typing', function(data) {
    room.users[publicID].show_typing = data;
    room.sync(2);
    return journal(room.name);
  });
  sock.on('sounds', function(data) {
    room.users[publicID].sounds = data;
    room.sync(2);
    return journal(room.name);
  });
  sock.on('speed', function(data) {
    if (data) {
      room.set_speed(data);
    }
    room.sync();
    return journal(room.name);
  });
  sock.on('buzz', function(data, fn) {
    if (room) {
      return room.buzz(publicID, fn);
    }
  });
  sock.on('guess', function(data) {
    if (room) {
      return room.guess(publicID, data);
    }
  });
  sock.on('chat', function(_arg) {
    var done, session, text;
    text = _arg.text, done = _arg.done, session = _arg.session;
    room.touch(publicID);
    if (done) {
      log('chat', [room.name, publicID + '-' + room.users[publicID].name, text]);
    }
    return room.emit('chat', {
      text: text,
      session: session,
      user: publicID,
      done: done,
      time: room.serverTime()
    });
  });
  sock.on('resetscore', function() {
    var u;
    u = room.users[publicID];
    room.emit('log', {
      user: publicID,
      verb: "was reset from " + u.correct + " correct of " + u.guesses + " guesses"
    });
    u.seen = u.interrupts = u.guesses = u.correct = u.early = 0;
    room.sync(1);
    return journal(room.name);
  });
  sock.on('report_question', function(data) {
    data.room = room.name;
    data.user = publicID + '-' + room.users[publicID].name;
    return log('report_question', data);
  });
  sock.on('report_answer', function(data) {
    data.room = room.name;
    data.user = publicID + '-' + room.users[publicID].name;
    return log('report_answer', data);
  });
  sock.on('check_rooms', function(checklist, fn) {
    var check_name, output, udat, uid, _i, _len, _ref, _ref1;
    output = {};
    for (_i = 0, _len = checklist.length; _i < _len; _i++) {
      check_name = checklist[_i];
      output[check_name] = 0;
      if ((_ref = rooms[check_name]) != null ? _ref.users : void 0) {
        _ref1 = rooms[check_name].users;
        for (uid in _ref1) {
          udat = _ref1[uid];
          if (udat.sockets.length > 0 && new Date - udat.last_action < 10 * 60 * 1000) {
            output[check_name]++;
          }
        }
      }
    }
    return fn(output);
  });
  return sock.on('disconnect', function() {
    log('disconnect', [room.name, publicID, sock.id]);
    room.del_socket(publicID, sock.id);
    room.sync(1);
    if (room.users[publicID].sockets.length === 0 && !room.users[publicID].ninja) {
      return room.emit('log', {
        user: publicID,
        verb: 'left the room'
      });
    }
  });
});

setInterval(function() {
  return clearInactive(1000 * 60 * 60 * 48);
}, 1000 * 10);

reaped = {
  name: "__reaped",
  users: 0,
  rooms: 0,
  seen: 0,
  correct: 0,
  guesses: 0,
  interrupts: 0,
  time_spent: 0,
  early: 0,
  last_action: +(new Date)
};

clearInactive = function(threshold) {
  var evict_user, len, name, offline_pool, oldest, oldest_user, overcrowded_room, room, user, username, _ref, _results;
  _results = [];
  for (name in rooms) {
    room = rooms[name];
    len = 0;
    offline_pool = (function() {
      var _ref, _results1;
      _ref = room.users;
      _results1 = [];
      for (username in _ref) {
        user = _ref[username];
        if (user.sockets.length === 0) {
          _results1.push(username);
        }
      }
      return _results1;
    })();
    overcrowded_room = offline_pool.length > 10;
    oldest_user = '';
    if (overcrowded_room) {
      oldest = offline_pool.sort(function(a, b) {
        return room.users[a].last_action - room.users[b].last_action;
      });
      oldest_user = oldest[0];
    }
    _ref = room.users;
    for (username in _ref) {
      user = _ref[username];
      len++;
      if (user.sockets.length === 0) {
        evict_user = false;
        if (overcrowded_room && username === oldest_user) {
          evict_user = true;
        }
        if ((user.last_action < new Date - threshold) || evict_user || (user.last_action < new Date - 1000 * 60 * 30 && user.guesses === 0) || (overcrowded_room && user.correct < 10 && user.last_action < new Date - 1000 * 60 * 15)) {
          log('reap_user', {
            seen: user.seen,
            guesses: user.guesses,
            early: user.early,
            interrupts: user.interrupts,
            correct: user.correct,
            time_spent: user.time_spent,
            last_action: user.last_action,
            room: name,
            id: user.id,
            name: user.name
          });
          reaped.users++;
          reaped.seen += user.seen;
          reaped.guesses += user.guesses;
          reaped.early += user.early;
          reaped.interrupts += user.interrupts;
          reaped.correct += user.correct;
          reaped.time_spent += user.time_spent;
          reaped.last_action = +(new Date);
          len--;
          delete room.users[username];
          overcrowded_room = false;
        }
      }
    }
    if (len === 0) {
      console.log('removing empty room', name);
      log('reap_room', name);
      delete rooms[name];
      _results.push(reaped.rooms++);
    } else {
      _results.push(void 0);
    }
  }
  return _results;
};

uptime_begin = +(new Date);

app.post('/stalkermode/update', function(req, res) {
  console.log('triggering application update check');
  io.sockets.emit('application_update', +(new Date));
  return res.redirect('/stalkermode');
});

app.post('/stalkermode/forceupdate', function(req, res) {
  console.log('forcing application update');
  io.sockets.emit('application_force_update', +(new Date));
  return res.redirect('/stalkermode');
});

app.post('/stalkermode/kickoffline', function(req, res) {
  clearInactive(1000 * 5);
  return res.redirect('/stalkermode');
});

app.post('/stalkermode/fullsync', function(req, res) {
  full_journal_sync();
  return res.redirect('/stalkermode');
});

app.post('/stalkermode/crash', function(req, res) {
  res.redirect('/stalkermode');
  return setTimeout(function() {
    throw 'fatal error';
  }, 1000);
});

app.post('/stalkermode/announce', express.bodyParser(), function(req, res) {
  io.sockets.emit('chat', {
    text: req.body.message,
    session: Math.random().toString(36).slice(3),
    user: '__' + req.body.name,
    done: true,
    time: +(new Date)
  });
  return res.redirect('/stalkermode');
});

app.get('/stalkermode', function(req, res) {
  var options, util;
  if (req.headers.host !== "protobowl.com" && app.settings.env !== 'development') {
    options = url.parse(req.url);
    options.host = 'protobowl.com';
    res.writeHead(301, {
      Location: url.format(options)
    });
    res.end();
    return;
  }
  util = require('util');
  return res.render('admin.jade', {
    env: app.settings.env,
    mem: util.inspect(process.memoryUsage()),
    start: uptime_begin,
    reaped: reaped,
    queue: Object.keys(journal_queue).length,
    rooms: rooms
  });
});

app.get('/new', function(req, res) {
  return res.redirect('/' + names.generatePage());
});

app.get('/', function(req, res) {
  var options;
  if (req.headers.host !== "protobowl.com" && app.settings.env !== 'development') {
    options = url.parse(req.url);
    options.host = 'protobowl.com';
    res.writeHead(301, {
      Location: url.format(options)
    });
    res.end();
    return;
  }
  return res.redirect('/lobby');
});

app.get('/:channel', function(req, res) {
  var name, options;
  name = req.params.channel;
  if (name !== "offline") {
    if (req.headers.host !== "protobowl.com" && app.settings.env !== 'development') {
      options = url.parse(req.url);
      options.host = 'protobowl.com';
      res.writeHead(301, {
        Location: url.format(options)
      });
      res.end();
      return;
    }
  }
  return res.render('room.jade', {
    name: name,
    env: app.settings.env
  });
});

port = process.env.PORT || 5000;

restore_journal(function() {
  return app.listen(port, function() {
    return console.log("listening on port", port);
  });
});
