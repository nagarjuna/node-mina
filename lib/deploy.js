// Generated by CoffeeScript 1.8.0
(function() {
  var BashScript, clc, initDeploy, path, spawn;

  path = require("path");

  clc = require("cli-color");

  spawn = require("child_process").spawn;

  BashScript = require("./bash").BashScript;


  /* Send commands to server */

  exports.deploy = function(config) {
    var s, server, xtermColor, _i, _len, _results;
    xtermColor = 13;
    server = config["server"];
    if (typeof server === "string") {
      return initDeploy(server, config, clc.xterm(xtermColor).bold);
    } else if (server instanceof Array) {
      _results = [];
      for (_i = 0, _len = server.length; _i < _len; _i++) {
        s = server[_i];
        initDeploy(s, config, clc.xterm(xtermColor).bold);
        _results.push(xtermColor += 1);
      }
      return _results;
    }
  };

  initDeploy = function(server, config, color) {
    var bs, dir, p, _srv_args;
    dir = config["server_dir"];
    if (config["history_releases_count"] && config["history_releases_count"] < 2) {
      config["history_releases_count"] = 2;
    }
    _srv_args = [];
    if (config["identity_file"]) {
      _srv_args.push("-i");
      _srv_args.push(config['identity_file']);
    }
    _srv_args.push(server);
    if (config["port"]) {
      _srv_args.push("-p " + config['port']);
    }
    _srv_args.push("bash -s");
    p = spawn("ssh", _srv_args, {
      stdio: ["pipe", 1, 2]
    });
    bs = new BashScript(p.stdin);
    return bs.queue(function() {

      /* Write cleanup function */
      var cmd, shared_dir, subdir, _i, _j, _k, _l, _len, _len1, _len2, _len3, _ref, _ref1, _ref2, _ref3;
      this.fun("cleanup", function() {
        var release_dir;
        release_dir = path.join(dir, "releases", "$rno");
        return this.if_zero("$rno", function() {
          return this.cmd("rm", "-rf", release_dir);
        });
      });

      /* Basic setup */
      this.log(server + " Create subdirs", color);
      _ref = ["shared", "releases", "tmp"];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subdir = _ref[_i];
        this.mkdir(dir, subdir);
      }
      this.log(server + " Create shared dirs", color);
      _ref1 = config["shared_dirs"];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        shared_dir = _ref1[_j];
        this.mkdir(dir, "shared", shared_dir);
      }
      this.cd(dir);

      /* Fetch code */
      this.log(server + " Fetch code", color);
      if (config["force_regenerate_git_dir"]) {
        this.cd(dir, "tmp");
        this.cmd("rm", "-rf", "scm");
      }
      this.cd(dir);
      this.if_not_dir_exists("tmp/scm/.git", function() {
        this.cd(dir, "tmp");
        this.cmd("rm", "-rf", "scm");
        return this.cmd("git", "clone", "-b", config["branch"], config["repo"], "scm");
      });
      this.cd(dir, "tmp", "scm");
      this.cmd("git", "fetch");
      this.cmd("git", "checkout", config["branch"]);
      this.cmd("git", "rebase", "origin/" + config["branch"]);
      this.log(server + " Copy code to release dir", color);
      this.raw('rno="$(readlink "' + (path.join(dir, "current")) + '")"');
      this.raw('rno="$(basename "$rno")"');
      this.math("rno=$rno+1");
      this.cmd("cp", "--preserve=timestamps", "-r", path.join(dir, "tmp", "scm", config["prj_git_relative_dir"] || ""), path.join(dir, "releases", "$rno"));

      /* Link shared dirs */
      this.log(server + " Link shared dirs");
      this.cd(dir, "releases", "$rno");
      _ref2 = config["shared_dirs"];
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        shared_dir = _ref2[_k];
        this.mkdir(path.dirname(shared_dir));
        this.raw("[ -h " + shared_dir + " ] && unlink " + shared_dir);
        this.cmd("ln", "-s", path.join(dir, "shared", shared_dir), shared_dir);
      }

      /* Run pre-start scripts */
      this.log(server + " Run pre-start scripts", color);
      _ref3 = config["prerun"];
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        cmd = _ref3[_l];
        this.raw_cmd(cmd);
      }

      /* Update current link */
      this.log(server + " Update current link", color);
      this.cd(dir);
      this.if_link_exists("current", function() {
        return this.cmd("rm", "current");
      });
      this.cmd("ln", "-s", "releases/$rno", "current");

      /* Start the service */
      this.log(server + " Start service", color);
      this.cmd("pwd");
      this.cd("current");
      this.raw_cmd(config["run_cmd"]);

      /* Clean the release dir */
      this.log(server + " Cleaning release dir", color);
      this.cd(dir, "releases");
      this.assign_output("release_dirs", this.build_find(".", {
        maxdepth: 1,
        mindepth: 1,
        type: "d",
        printf: "%f\\n"
      }));
      this.assign_output("num_dirs", 'echo "$release_dirs" | wc -l');
      this.raw("dirs_num_to_keep=" + (config["history_releases_count"] || 10));
      return this.if_math("num_dirs > dirs_num_to_keep", function() {
        return this.pipe((function() {
          this.math("dirs_num_to_remove=$num_dirs-$dirs_num_to_keep");
          return this.raw('echo "$release_dirs" | sort -n | head -n$dirs_num_to_remove');
        }), (function() {
          return this["while"]("read rm_dir", function() {
            return this.cmd("rm", "-rf", "$rm_dir");
          });
        }));
      });
    });
  };

}).call(this);
