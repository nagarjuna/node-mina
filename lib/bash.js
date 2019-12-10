// Generated by CoffeeScript 1.8.0
(function() {
  var BashScript, binary_if_tests, clc, enclose_quotes, name, path, quote_args, symbol, unary_if_tests, _fn, _fn1,
    __slice = [].slice;

  clc = require("cli-color");

  path = require("path");


  /* Facilities to iteratively construct a bash script */

  BashScript = (function() {
    function BashScript(stream) {
      this.stream = stream;
    }

    BashScript.prototype.queue = function(queue_f) {
      queue_f.call(this);
      return this.stream.end();
    };

    BashScript.prototype.raw = function(raw) {
      return this.stream.write(raw + "\n");
    };

    BashScript.prototype.shebang = function() {
      return this.raw("#!/bin/bash");
    };

    BashScript.prototype.echo = function(text) {
      return this.raw("echo " + (enclose_quotes(text)));
    };

    BashScript.prototype.log = function(desc, cf) {
      if (cf == null) {
        cf = clc.white.bold;
      }
      return this.echo(cf("----> " + desc));
    };

    BashScript.prototype.log_cmd = function() {
      var cmd;
      cmd = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.log(cmd.join(" "), clc.white);
    };

    BashScript.prototype["if"] = function(cond, then_queuer, else_queuer) {
      this.raw("if " + cond + "; then");
      then_queuer.call(this);
      if (else_queuer != null) {
        this.raw("else");
        else_queuer.call(this);
      }
      return this.raw("fi");
    };

    BashScript.prototype.if_test = function(cond, then_queuer, else_queuer) {
      return this["if"]("[[ " + cond + " ]]", then_queuer, else_queuer);
    };

    BashScript.prototype.if_math = function(cond, then_queuer, else_queuer) {
      return this["if"]("(( " + cond + " ))", then_queuer, else_queuer);
    };

    BashScript.prototype.if_cmd_successful = function(then_queuer, else_queuer) {
      return this.if_num_equal("$?", "0", then_queuer, else_queuer);
    };

    BashScript.prototype["while"] = function(cond, body_queuer) {
      this.raw("while " + cond + "; do");
      body_queuer.call(this);
      return this.raw("done");
    };

    BashScript.prototype.fun = function(name, body_queuer) {
      this.raw("function " + name + " {");
      body_queuer.call(this);
      return this.raw("}");
    };

    BashScript.prototype.pipe = function(left_queuer, right_queuer) {
      this.raw("(");
      left_queuer.call(this);
      this.raw(") | (");
      right_queuer.call(this);
      return this.raw(")");
    };

    BashScript.prototype.cmd = function() {
      var args, cmd;
      cmd = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      this.log_cmd.apply(this, [cmd].concat(__slice.call(args)));
      this.raw(cmd + " " + (quote_args(args)));
      return this.error_check();
    };

    BashScript.prototype.cd = function() {
      var dir_components;
      dir_components = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.cmd("cd", path.join.apply(path, dir_components));
    };

    BashScript.prototype.mkdir = function() {
      var dir_components;
      dir_components = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return this.cmd("mkdir", "-p", path.join.apply(path, dir_components));
    };

    BashScript.prototype.math = function(expr) {
      return this.raw("(( " + expr + " ))");
    };

    BashScript.prototype.assign = function(variable, val) {
      if (typeof val === "function") {
        this.stream.write("" + variable + "=\"");
        val.call(this);
        return this.stream.write("\"");
      } else {
        return this.raw("" + variable + "=\"" + val + "\"");
      }
    };

    BashScript.prototype.assign_output = function() {
      var args, cmd, val, variable;
      variable = arguments[0], cmd = arguments[1], args = 3 <= arguments.length ? __slice.call(arguments, 2) : [];
      if (typeof cmd === "function") {
        val = (function(_this) {
          return function() {
            _this.stream.write("$(");
            cmd.call(_this);
            return _this.stream.write(")");
          };
        })(this);
      } else {
        val = "$(" + cmd + " " + (quote_args(args)) + ")";
      }
      return this.assign(variable, val);
    };

    BashScript.prototype.find = function(dir, options) {
      return this.raw_cmd(build_find(dir, options));
    };

    BashScript.prototype.raw_cmd = function(cmd) {
      this.log_cmd(cmd);
      this.raw(cmd);
      return this.error_check();
    };

    BashScript.prototype.error_check = function() {
      return this.if_cmd_successful((function() {
        return this.log("ok", clc.green);
      }), (function() {
        this.log("Command failed with code $?", clc.red);
        return this.raw("cleanup; exit 1");
      }));
    };

    BashScript.prototype.build_find = function(dir, options) {
      var args, opt, val;
      args = [dir];
      for (opt in options) {
        val = options[opt];
        args.push("-" + opt);
        if (val) {
          args.push(val);
        }
      }
      return "find " + (quote_args(args));
    };

    return BashScript;

  })();

  unary_if_tests = {
    exists: "-e",
    file_exists: "-f",
    dir_exists: "-d",
    link_exists: "-h",
    pipe_exists: "-p",
    readable: "-r",
    writable: "-w",
    block_file_exists: "-b",
    char_file_exists: "-c",
    zero: "-z",
    nonzero: "-n"
  };

  binary_if_tests = {
    equal: "=",
    not_equal: "!=",
    less: "<",
    greater: ">",
    num_equal: "-eq",
    num_not_equal: "-ne",
    num_less: "-lt",
    num_greater: "-gt",
    num_less_equal: "-le",
    num_greater_equal: "-ge"
  };

  _fn = function(name, symbol) {
    BashScript.prototype["if_" + name] = function(cond, then_queuer, else_queuer) {
      return this.if_test("" + symbol + " " + cond, then_queuer, else_queuer);
    };
    return BashScript.prototype["if_not_" + name] = function(cond, then_queuer, else_queuer) {
      return this.if_test("! " + symbol + " " + cond, then_queuer, else_queuer);
    };
  };
  for (name in unary_if_tests) {
    symbol = unary_if_tests[name];
    _fn(name, symbol);
  }

  _fn1 = function(name, symbol) {
    return BashScript.prototype["if_" + name] = function(op1, op2, then_queuer, else_queuer) {
      return this.if_test("" + op1 + " " + symbol + " " + op2, then_queuer, else_queuer);
    };
  };
  for (name in binary_if_tests) {
    symbol = binary_if_tests[name];
    _fn1(name, symbol);
  }

  enclose_quotes = function(text) {
    return '"' + (text.toString().replace(/"/g, '"')) + '"';
  };

  quote_args = function(args) {
    return (args.map(enclose_quotes)).join(" ");
  };

  exports.BashScript = BashScript;

}).call(this);