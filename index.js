var rl, readline = require('readline'); //imports module supporting line-by-line user input and system output

/**
 * This function creates an input and output interface with the readline module
 * @param {string} stdin - input stream
 * @param {string} stdout - output stream
 * @returns {interface} rl - readline interface
 */
var get_interface = function(stdin, stdout) {
    if (!rl) rl = readline.createInterface(stdin, stdout);
    else stdin.resume(); //interface exists
    return rl;
}

/**
 * This function creates a message prompt asking the user to confirm an action or response
 * @param {string} message - confirmation message/prompt
 * @param {function} callback - function that is called once user responds to confirmation
 * @returns {function} callback - function that is called once user responds to confirmation
 */
var confirm = exports.confirm = function(message, callback) {
    //initializes confirmation prompt with default answer of "yes"
    var question = {
        'reply': {
        type: 'confirm',
        message: message,
        default: 'yes'
        }
    }

    /**
     * This function processes the user's response and call for the follow up function; if user response is invalid, will display error message
     * @param {function} err - function that is called in case of invalid response
     * @param {string} answer - user's input
     * @returns {function} callback - function that is called once user responds
     */
    get(question, function(err, answer) {
        if (err) return callback(err); 
        callback(null, answer.reply === true || answer.reply == 'yes');
    });
};

/**
 * This function creates question prompts to ask the user, processes responses while validating user input, and outputs a response to the user action
 * @param {object} options - possible options for prompts and types of user responses
 * @param {function} callback - function that is called once user responds to prompt
 * @returns {function} callback - function that is called once user responds to prompt
 */
var get = exports.get = function(options, callback) {
    //check if there is a callback function passed in, and if not, then do not continue
    if (!callback) return; 

    //if parameter passed in is not of object type, then display error message
    if (typeof options != 'object') return callback(new Error("Please pass a valid options object.")) 

    //creates empty array to store user responses
    var answers = {},
        stdin = process.stdin,
        stdout = process.stdout,
        fields = Object.keys(options);

    //once prompt is complete, closes the prompt and respond to user with callback function
    var done = function() {
        close_prompt();
        callback(null, answers);
    }
  
    //once prompt is closed, terminate the readline interface
    var close_prompt = function() {
        stdin.pause();
        if (!rl) return;
        rl.close();
        rl = null;
    }

   /**
    * This function returns the default answer for the current prompt
    * @param {string} key - user input
    * @param {function} partial_answers - contains list of possible partial answers
    * @returns {array} options - valid options to put as an user response
    */
    var get_default = function(key, partial_answers) {
        if (typeof options[key] == 'object') return typeof options[key].default == 'function' ? options[key].default(partial_answers) : options[key].default;
        else return options[key];
    }

   /**
    * This function returns the true/false value of the user's response
    * @param {string} reply - user input
    * @returns {boolean|string} - the boolean value of the user input OR if answer is not yes/no, the user input itself
    */
    var guess_type = function(reply) {
        if (reply.trim() == '') return; //if there is no use response, then return nothing
        else if (reply.match(/^(true|y(es)?)$/)) return true; //response of yes or true will return true
        else if (reply.match(/^(false|n(o)?)$/)) return false; //response of no or false will return false
        else if ((reply*1).toString() === reply) return reply*1;
        return reply;
    }
   
   /**
    * This function validates user responses and returns whether its type is of the required type
    * @param {string} key - user response
    * @param {function} answer - possible answers to the prompts
    * @returns {boolean} - true is user input is an valid option or false if input is invalid
    */
    var validate = function(key, answer) {
        if (typeof answer == 'undefined') return options[key].allow_empty || typeof get_default(key) != 'undefined';
        else if(regex = options[key].regex) return regex.test(answer);
        else if(options[key].options) return options[key].options.indexOf(answer) != -1;
        else if(options[key].type == 'confirm') return typeof(answer) == 'boolean'; //answer was given so it should be
        else if(options[key].type && options[key].type != 'password') return typeof(answer) == options[key].type;
        return true;
    }

   /**
    * This function outputs an error message if the user response is invalid and displays the valid response types
    * @param {string} key - user input
    */    
    var show_error = function(key) {
        var str = options[key].error ? options[key].error : 'Invalid value.';
        if (options[key].options)str += ' (options are ' + options[key].options.join(', ') + ')';
        stdout.write("" + str + "" + "\n");
    }

  /**
    * This function outputs the current prompt's message and displays the valid response options
    * @param {string} key - user input
    */
    var show_message = function(key) {
        var msg = '';
        if (text = options[key].message) msg += text.trim() + ' ';
        if (options[key].options) msg += '(options are ' + options[key].options.join(', ') + ')';
        if (msg != '') stdout.write("" + msg + "\n");
    }
   

  /**
    * For password fields, this function will wait for the user to begin typing and then display *'s instead of the letters typed; when Crtl+C is used, it will terminate prompt and display error message
    * @param {string} prompt - the question prompt given to users
    * @param {function} callback - function that is called once user responds to prompt
    * @returns {function} callback - function that is called once user responds to prompt
    */
    var wait_for_password = function(prompt, callback) {
        var buf = '', //when nothing is typed, show blank field
            mask = '*'; //when something is typed, show * in replacement of the actual letters

      /**
        * This function check what keystrokes the user has pressed and processes their response
        * @param {object} c - the letter c
        * @param {string} key - user input
        * @returns {function} callback - function that is called once user presses a key
        */    
        var keypress_callback = function(c, key) {
            if (key && (key.name == 'enter' || key.name == 'return')) {
                stdout.write("\n");
                stdin.removeAllListeners('keypress');
                //stdin.setRawMode(false);
                return callback(buf);
            }
            
            //if control+c is pressed, then close prompt
            if (key && key.ctrl && key.name == 'c')
                close_prompt();
            
            //if backspace is pressed, then delete the last character typed and revert it back to a blank space
            if (key && key.name == 'backspace') {
                buf = buf.substr(0, buf.length-1);
                var masked = '';
                for (i = 0; i < buf.length; i++) { masked += mask; }
                stdout.write('' + prompt + masked);
            } else {
                stdout.write(mask);
                buf += c;
            }
        };
        stdin.on('keypress', keypress_callback);
    }

   /**
    * This function checks if the user's response is valid and of the correct type for the current question; if response is invalid, will display an error message
    * @param {number} index - the index of the current user response
    * @param {string} curr_key - current question's correct answer
    * @param {string} fallback - default answer if user's response type is undefined
    * @param {string} reply - user input
    */
    var check_reply = function(index, curr_key, fallback, reply) {
        var answer = guess_type(reply);
        var return_answer = (typeof answer != 'undefined') ? answer : fallback;
        
        //if user response type is valid, then go on to the next question
        if (validate(curr_key, answer)) next_question(++index, curr_key, return_answer);
        else show_error(curr_key) || next_question(index); //repeats current
    }

   /**
    * This function checks if the current prompt's dependencies are met
    * @param {array} conds - conditions that must be met to satisfy dependency requirement
    * @returns {boolean} - true if the dependencies are met or false if not met
    */
    var dependencies_met = function(conds) {
        for (var key in conds) { //for all the keys in the conditions array, assign each a local variable
            var cond = conds[key]; 
            if (cond.not) { //object, inverse
                if (answers[key] === cond.not) return false;
            } else if (cond.in) { //array 
                if (cond.in.indexOf(answers[key]) == -1) return false;
            } else {
                if (answers[key] !== cond) return false; 
            }
        }
        return true;
    }

   /**
    * This function keeps track of the order of questions and will prompt the next question after the current question is complete
    * @param {number} index - index of the current and next questions
    * @param {string} prev_key - answer for the previous question
    * @param {answer} answer - user input for the current question
    * @returns {function} next_question - the next question if the last question was answered and if there are still questions waiting to be asked
    */
    var next_question = function(index, prev_key, answer) {
        if (prev_key) answers[prev_key] = answer; //if previous question was answered correctly...

        var curr_key = fields[index]; //...then set key to the current index
        
        if (!curr_key) return done(); //if current question is not answered correctly, terminate question

        if (options[curr_key].depends_on) {
            if (!dependencies_met(options[curr_key].depends_on))
                return next_question(++index, curr_key, undefined);
            }

            var prompt = (options[curr_key].type == 'confirm') ? ' - yes/no: ' : " - " + curr_key + ": ";

            var fallback = get_default(curr_key, answers);
            if (typeof(fallback) != 'undefined' && fallback !== '') prompt += "[" + fallback + "] ";

            show_message(curr_key);

            if (options[curr_key].type == 'password') {

            var listener = stdin._events.keypress; //to reassign down later
            stdin.removeAllListeners('keypress');

            //stdin.setRawMode(true);
            stdout.write(prompt);

            wait_for_password(prompt, function(reply) {
                stdin._events.keypress = listener; //reassign
                check_reply(index, curr_key, fallback, reply)
            });
        } else {
            rl.question(prompt, function(reply) {
                check_reply(index, curr_key, fallback, reply);
            });
        }
    }

    //begins asking user question prompts
    rl = get_interface(stdin, stdout);
    next_question(0);

    //this function will close the current prompt and output the number of user responses so far
    rl.on('close', function() {
        close_prompt(); //just in case
        var given_answers = Object.keys(answers).length;
        if (fields.length == given_answers) return;
        var err = new Error("Cancelled after giving " + given_answers + " answers.");
        callback(err, answers);
    });
}