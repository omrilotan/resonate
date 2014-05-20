var resonate = (function __resonate__ (window, navigator, document, constants, undefined) {

        // Interface
    var exports = {},

        // Detection methods
        detect = {},

        // flash file tests microphone presence
        FLASH_MIC_TEST_SWIFF,

        callback,

        toArray = function resonate$_toArray (args) {
            return [].slice.call(args, 0);
        },

        register = function resonate$_register (who, what, fn) {
            if (typeof fn === constants.o[1]) {
                fn(who, what);
            }
        };

    // WEBRTC
    detect[constants.s[0]] = function resonate$_detect$WEBRTC (next) {
        var result;
        window.RTCPeerConnection = window.RTCPeerConnection ||
                window.webkitRTCPeerConnection ||
                window.mozRTCPeerConnection ||
                window.msRTCPeerConnection;

        next(typeof window.RTCPeerConnection === constants.o[1]);
    };

    // USER_MEDIA_MICROPHONE
    detect[constants.s[2]] = function resonate$_detect$USER_MEDIA_MICROPHONE (next) {
        var limits = {
                fail: 7 * 1000,    // Total time after which the test is considered to have failed
                allow: 5 * 1000,    // After this time a message is prompted to allow microphone access
                silence: 5 * 1000,    // After microphone access was granted, time to wait for sound
            },

            timeoutInervals = 0,

            finished = false,    // prevent repetitive tests
            
            // Microphone response time measurement
            start = (new Date()).getTime(),
            end,
            
            timers = {},
            clearTimers = function resonate$_clearTimers () {
                var key;

                //  clear all timeouts
                for (key in timers) {
                    if (timers.hasOwnProperty(key)) {
                        clearTimeout(timers[key]);
                    }
                }
            },

            failTimer = function resonate$_failTimer () {
                if (++timeoutInervals < 3) {
                    callback(constants.t[2],    // PROMPT
                            constants.m[11]);    // PLEASE_WAIT
                    timers.fail = setTimeout(failTimer, limits.fail);
                } else {
                    finished = true;
                    clearTimers();

                    end = (new Date()).getTime();
                    next(false,
                        constants.r[0],    // TIMEOUT
                        (end - start) / 1000);
                }
            },

            // getUserMedia Callbacks
            success,
            fail;

        navigator.getUserMedia = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia;

        window.AudioContext = window.AudioContext ||
                window.webkitAudioContext ||
                window.mozAudioContext ||
                window.msAudioContext;

        // No available getUserMedia method. abort
        if (typeof navigator.getUserMedia !== constants.o[1]) {
            next(false);
            return;
        }

        
        // Fail timer
        timers.fail = setTimeout(failTimer, limits.fail);
        
        // Allow timer: when waiting for the "Allow" of microphone use
        timers.allow = setTimeout(function resonate$_allowTimer () {
            clearTimeout(timers.allow);
            callback(constants.t[2],    // PROMPT
                    constants.m[2]);    // ALLOW_MICROPHONE_ACCESS
        }, limits.allow);

        success = function resonate$_getUserMediaSuccess (stream) {
            
            // Microphone access granted
            clearTimeout(timers.allow);
            start = (new Date()).getTime();

            var audioContext,
                analyser,
                microphone,
                node;
            try {
                var audioContext = new window.AudioContext(),
                    analyser = audioContext.createAnalyser(),
                    microphone = audioContext.createMediaStreamSource(stream);
                if (typeof audioContext.createJavaScriptNode === constants.o[1]) {
                    node = audioContext.createJavaScriptNode(2048, 1, 1);
                } else if (typeof audioContext.createScriptProcessor === constants.o[1]) {
                    node = audioContext.createScriptProcessor(2048, 1, 1);
                } else {
                    throw new Error(constants.m[8]);    // UNABLE_TO_ACCESS_USER_MICROPHONE
                }
            } catch (err) {
                clearTimers();
                next(false, err.message);
                return;
            }

            analyser.smoothingTimeConstant = 0.3;
            analyser.fftSize = 1024;

            microphone.connect(analyser);
            analyser.connect(node);
            node.connect(audioContext.destination);

            callback(constants.t[2],    // PROMPT
                    constants.m[1]);    // DETECTING_MICROPHONE_INPUT
            
            // Now we wait to hear the microphone
            // NOTE: This may take a couple of seconds to kick in
            node.onaudioprocess = function resonate$_audioprocess () {
                if (finished === true) {
                    return;
                }

                // First part worked, clear timers
                clearTimers();

                // Silence timer: in case we can't hear anything within 5 seconds
                timers.silence = setTimeout(function resonate$_silenceTimer () {
                    finished = true;
                    clearTimers();
                    next(false,    // FAIL
                            constants.r[1]);    // NO_SOUND_DETECTED
                }, limits.silence);

                // Count the bits in the incoming frequency
                var array = new Uint8Array(analyser.frequencyBinCount),
                    len = array.length,
                    i = 0,
                    values = 0,
                    average;
                analyser.getByteFrequencyData(array);

                // Adding up the frequencies
                for (; i < len; i++) {
                    values += array[i];
                }

                average = values / len;
                
                if (average > 0) {
                    finished = true;
                    clearTimers();

                    end = (new Date()).getTime();
                    callback(constants.t[2],    // PROMPT
                            constants.m[9],    // MICROPHONE_RESPONSE_TIME
                            (end - start) / 1000);
                    
                    next(true);
                }
            }
        };
        fail = function resonate$_getUserMediaFail () {
            clearTimers();
            if (finished === true) {
                return;
            }
            callback(constants.t[1],    // FAIL
                    constants.m[8]);    // UNABLE_TO_ACCESS_USER_MICROPHONE
        };

        // Begin
        navigator.getUserMedia({ audio: true }, success, fail);
    };

    // FLASH
    detect[constants.s[1]] = function resonate$_detect$FLASH (next) {
        var type = "application/x-shockwave-flash",
            plugins = navigator.plugins,
            mimeTypes,
            flashObject,
            version;
        if (plugins &&
                plugins.length > 0) {
            mimeTypes = navigator.mimeTypes;
            if (mimeTypes &&
                    mimeTypes[type]) {
                try {
                    version = parseInt(mimeTypes[type].enabledPlugin.description.replace(/[a-zA-Z]/g, ""), 10);
                    next(version > 10);

                } catch (err) {
                    // do nothing
                }
            }
        } else if (navigator.appVersion.indexOf("Mac") === -1 &&
                window.execScript) {
            try {
                flashObject = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
                version = parseInt(flashObject.GetVariable("$version").replace(/[a-zA-Z]/g, ""), 10);
            } catch (err) {
                version = -1;
            }
            next(version !== -1);
        }
    };

    // FLASH_MICROPHONE
    detect[constants.s[3]] = function resonate$_detect$FLASH_MICROPHONE (next) {
        var finished = false,
            timer = setTimeout(function resonate$_failTimeout () {
                finished = true;
                next(false,
                        constants.r[0]);    // TIMEOUT
            }, (15 * 1000)),
            object,
            param,
            embed,
            name = "flash_mic_detect",
            src = FLASH_MIC_TEST_SWIFF,
            first = document.getElementById(name),
            createElementWithAttributes = function resonate$_createElementWithAttributes (tag, attributes) {
                var element = document.createElement(tag);
                attributes.forEach(function resonate$_attributesLoop (attribute) {
                    element.setAttribute(attribute.name, attribute.value);
                });
                return element;
            },
            createParam = function resonate$_createParam (name, value) {
                return createElementWithAttributes("param", [
                    { name: "name", value: name },
                    { name: "value", value: value }
                ]);
            };

        if (first !== null && first.parentNode) {
            first.parentNode.removeChild(first);
        }

        object = createElementWithAttributes("object", [
            { name: "classid", value: "clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" },
            { name: "codebase", value: "http://fpdownload.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=8,0,0,0" },
            { name: "width", value: "1" },
            { name: "height", value: "1" },
            { name: "id", value: name }
        ]);

        object.appendChild(createParam("allowScriptAccess", "always"));
        object.appendChild(createParam("movie", src));
        object.appendChild(createParam("quality", "high"));
        object.appendChild(createParam("bgcolor", "#ffffff"));

        object.appendChild(createElementWithAttributes("embed", [
            { name: "src", value: src },
            { name: "quality", value: "high" },
            { name: "bgcolor", value: "#ffffff" },
            { name: "width", value: "1" },
            { name: "height", value: "1" },
            { name: "name", value: name },
            { name: "allowScriptAccess", value: "always" },
            { name: "type", value: "application/x-shockwave-flash" },
            { name: "pluginspage", value: "http://www.macromedia.com/go/getflashplayer" }
        ]));

        document.body.appendChild(object);
        window.flashLoaded = function resonate$_flashLoaded () {
            var movie = navigator.appName.toLowerCase().indexOf("microsoft") !== -1 ?
                    window[name] :
                    document[name],
                mics = movie.micNames();

            // callback(constants.t[2],    // PROMPT
            //         constants.m[10],    // NUMBER_OF_MICROPHONES
            //         mics.length);
            next(mics.length > 0);
            clearTimeout(timer);
            delete window.flashLoaded;
        };

    };

    exports = function resonate (options) {
        options = options || {};
        if (typeof options.FLASH_MIC_TEST_SWIFF === constants.o[0]) {
            FLASH_MIC_TEST_SWIFF = options.FLASH_MIC_TEST_SWIFF;
        }
    };

    exports.check = function resonate$check (fn) {
        var responses = {};
        if (typeof fn !== constants.o[1]) {
            return;
        }
        callback = fn;

        // WEBRTC
        responses[constants.s[0]] = function resonate$_responses$WEBRTC () {
            var args = toArray(arguments),
                condition = args.shift();
            args.unshift(constants.t[2],    // PROMPT
                    constants.m[0]);    // WEBRTC_WAITING_FOR_MICROPHONE
            if (!!condition) {
                callback.apply(null, args);    // WEBRTC_WAITING_FOR_MICROPHONE
                detect[constants.s[2]](responses[constants.s[2]]);
            } else {

                // FLASH
                detect[constants.s[1]](responses[constants.s[1]]);
            }
        };

        // USER_MEDIA_MICROPHONE
        responses[constants.s[2]] = function resonate$_responses$USER_MEDIA_MICROPHONE () {
            var args = toArray(arguments),
                condition = args.shift();
            if (!!condition) {
                args.unshift(constants.t[3],    // FINALLY
                        constants.m[3]);    // MICROPHONE_DETECTED
                callback.apply(null, args);
            } else {
                args.unshift(constants.t[1],    // FAIL
                        constants.m[7]);    // NO_MICROPHONE_DETECTED
                callback.apply(null, args);
            }
        };

        // FLASH
        responses[constants.s[1]] = function () {
            var args = toArray(arguments),
                condition = args.shift();
            if (!!condition) {
                args.unshift(constants.t[2],    // PROMPT
                        constants.m[4]);    // FLASH_WAITING_FOR_MICROPHONE
                callback.apply(null, args);
                detect[constants.s[3]](responses[constants.s[3]]);
            } else {
                args.unshift(constants.t[1],    // FAIL
                        constants.m[6]);    // NO_AVAILABLE_MEDIA
                callback.apply(null, args);
            }
        };

        // FLASH_MICROPHONE
        responses[constants.s[3]] = function () {
            var args = toArray(arguments),
                condition = args.shift();
            if (!!condition &&
                    typeof FLASH_MIC_TEST_SWIFF === constants.o[0]) {
                args.unshift(constants.t[3],    // FINALLY
                        constants.m[5]);    // FLASH_MICROPHONE_DETECTED
                callback.apply(null, args);
            } else {
                args.unshift(constants.t[1],    // FAIL
                        constants.m[7]);    // NO_MICROPHONE_DETECTED
                callback.apply(null, args);
            }
        };

        // Begin
        detect[constants.s[0]](responses[constants.s[0]]);
    };

    return exports;

}(window, navigator, document, {
    
        // constants:
            // Type
            t: [
                "PASS",
                "FAIL",
                "PROMPT",
                "FINALLY"
            ],

            // Reasons
            r: [
                "TIMEOUT",
                "NO_SOUND_DETECTED"
            ],

            // Message
            m: [
                "WEBRTC_WAITING_FOR_MICROPHONE",
                "DETECTING_MICROPHONE_INPUT",
                "ALLOW_MICROPHONE_ACCESS",
                "MICROPHONE_DETECTED",
                
                "FLASH_WAITING_FOR_MICROPHONE",
                "FLASH_MICROPHONE_DETECTED",
                
                "NO_AVAILABLE_MEDIA",
                "NO_MICROPHONE_DETECTED",

                "UNABLE_TO_ACCESS_USER_MICROPHONE",

                "MICROPHONE_RESPONSE_TIME",
                "NUMBER_OF_MICROPHONES",
                "PLEASE_WAIT"
            ],

            // Service
            s: [
                "WEBRTC",
                "FLASH",
                "USER_MEDIA_MICROPHONE",
                "FLASH_MICROPHONE"
            ],

            // typeof
            o: [
                "string",
                "function"
            ]
        }));