/**
 * Copyright (c) 1998-2016 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 *
 */
/**
 * Module Description - Hard Approve Time
 *
 * Version    	Date            	Author          Remarks
 * 1.00       	Feb 28, 2017  		jjacob 			Initial version.
 * 
 */

var ScriptLocker =
    {

        CUSTOMRECORD_SCRIPT_LOCKER: 'customrecord_script_locker',
        CUSTRECORD_SCRIPT_LOCKER_SCRIPT: 'custrecord_script_locker_script',
        CUSTRECORD_SCRIPT_LOCKER_USER: 'custrecord_script_locker_user',
        CUSTRECORD_SCRIPT_LOCKER_FIELD: 'custrecord_script_locker_field',
        CUSTRECORD_SCRIPT_LOCKER_VALUE: 'custrecord_script_locker_value',

        /**
         * Checks if a script is currently being processed.
         * If not, will create a Script Locker record to temporarily lock the script
         * 
         * @param option.scriptId
         * @param option.lockOnField
         * @param option.lockOnFieldValue
         * @param option.user
         * @param option.scriptName
         * 
         */
        /*
        getOrCreate : function(option)
        {
            var logTitle = 'ScriptLocker.lockOrStart';
        	
            ScriptLocker.requireParam(option);
        	
            // Search script id by script name
            var scriptId = option.scriptId || ScriptLocker.searchScriptByName({ name: option.scriptName });
        	
            nlapiLogExecution('debug', logTitle, 'scriptId=' + scriptId + ' | user=' + option.user + 
                    ' | lockOnField=' + option.lockOnField + ' | lockOnFieldValue=' + option.lockOnFieldValue);
        	
            ScriptLocker.requireParam(scriptId);
            ScriptLocker.requireParam(option.user);
            ScriptLocker.requireParam(option.lockOnField);
            ScriptLocker.requireParam(option.lockOnFieldValue);
        	
            // Get script locker record
            var isOnProcess = ScriptLocker.isOnProcess({ 
                scriptId : scriptId, 
                lockOnField : option.lockOnField,
                lockOnFieldValue : option.lockOnFieldValue
            });
        	
            // Script is locked
            if (isOnProcess)
            {
                throw nlapiCreateError('SCRIPT_IS_LOCKED', 'script=' + scriptId + ' | ' + option.lockOnField + '=' + option.lockOnFieldValue);
            }	
        	
            else
            {
                // Create script locker record
                scriptLockerId = ScriptLocker.create({
                    scriptId : scriptId,
                    user : option.user,
                    lockOnField : option.lockOnField,
                    lockOnFieldValue : option.lockOnFieldValue
                });
            	
                nlapiLogExecution('audit', logTitle, 'SCRIPT_LOCKER_CREATED: id=' + scriptLockerId);
            	
            }	
        	
            return scriptLockerId;
        	
        },
        */
        /**
         * Creates a script locker record for a specific script and subsidiary
         * 
         * @param {String} option.scriptId
         * @param {String} option.scriptName
         * @param {String} option.user
         * @param {String} option.lockOnField
         * @param {String} option.lockOnFieldValue
         */
        create: function (option) {
            var logTitle = 'ScriptLocker.create';

            // Check required parameters
            ScriptLocker.requireParam(option);
            ScriptLocker.requireParam(option.user);
            ScriptLocker.requireParam(option.lockOnField);
            ScriptLocker.requireParam(option.lockOnFieldValue);

            // Get script id by script name
            var scriptId = option.scriptId || ScriptLocker.searchScriptByName({ name: option.scriptName });
            ScriptLocker.requireParam(scriptId);

            nlapiLogExecution('debug', logTitle, 'scriptId=' + scriptId + ' | user=' + option.user +
                ' | lockOnField=' + option.lockOnField + ' | lockOnFieldValue=' + option.lockOnFieldValue);

            // Create new script locker record
            var newScriptLocker = nlapiCreateRecord(ScriptLocker.CUSTOMRECORD_SCRIPT_LOCKER);
            newScriptLocker.setFieldValue(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_SCRIPT, scriptId);
            newScriptLocker.setFieldValue(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_USER, option.user);
            newScriptLocker.setFieldValue(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_FIELD, option.lockOnField);
            newScriptLocker.setFieldValue(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_VALUE, option.lockOnFieldValue);

            // Submit script locker record
            return nlapiSubmitRecord(newScriptLocker);

        },

        /**
         * Search for script id based on script name
         * 
         * @param {String} option.name
         */
        searchScriptByName: function (option) {
            // Check required parameters
            ScriptLocker.requireParam(option);
            ScriptLocker.requireParam(option.name);

            var results = nlapiSearchRecord('script', null, [nlobjSearchFilter('scriptid', null, 'is', option.name)]);
            return (results && results[0]) ? results[0].getId() : null;

        },

        /**
         * Ends a process/script either by script locker id or script id
         * @param {String} option.id - Script locker record internal id
         */
        remove: function (option) {
            var logTitle = 'ScriptLocker.remove';

            // Check required parameters
            ScriptLocker.requireParam(option);
            ScriptLocker.requireParam(option.id);

            // Delete script locker record
            if (option.id) {
                nlapiDeleteRecord(ScriptLocker.CUSTOMRECORD_SCRIPT_LOCKER, option.id);
                nlapiLogExecution('audit', logTitle, 'SCRIPT_LOCKER_DELETED: id=' + option.id);
            }

        },

        /**
         * Search for script locker record based on script and subsidiary
         * @param {String} option.script
         * @param {String} option.subsidiary
         * 
         */
        search: function (option) {

            var logTitle = 'ScriptLocker.get';

            // Check required parameters
            ScriptLocker.requireParam(option);
            ScriptLocker.requireParam(option.scriptId);
            ScriptLocker.requireParam(option.lockOnField);
            ScriptLocker.requireParam(option.lockOnFieldValue);

            var filters = [];
            filters.push(new nlobjSearchFilter(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_SCRIPT, null, 'is', option.scriptId));
            filters.push(new nlobjSearchFilter(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_FIELD, null, 'is', option.lockOnField));
            filters.push(new nlobjSearchFilter(ScriptLocker.CUSTRECORD_SCRIPT_LOCKER_VALUE, null, 'is', option.lockOnFieldValue));

            // Search script locker
            return nlapiSearchRecord(ScriptLocker.CUSTOMRECORD_SCRIPT_LOCKER, null, filters);

        },

        /**
         * @param {String} option.scriptId OPTIONAL
         * @param {String} option.scriptName OPTIONAL
         * @param {String} option.lockOnField REQUIRED
         * @param {String} option.lockOnFieldValue REQUIRED
         */
        isOnProcess: function (option) {
            var logTitle = 'ScriptLocker.isOnProcess';

            // Check required parameters
            ScriptLocker.requireParam(option);
            ScriptLocker.requireParam(option.scriptId);
            ScriptLocker.requireParam(option.lockOnField);
            ScriptLocker.requireParam(option.lockOnFieldValue);

            var scriptId = option.scriptId || ScriptLocker.searchScriptByName({ name: option.scriptName });
            ScriptLocker.requireParam(scriptId);

            nlapiLogExecution('debug', logTitle, 'scriptId=' + scriptId + ' | user=' + option.user +
                ' | lockOnField=' + option.lockOnField + ' | lockOnFieldValue=' + option.lockOnFieldValue);

            // Search based on script and subsidiary
            var results = ScriptLocker.search({
                scriptId: scriptId,
                lockOnField: option.lockOnField,
                lockOnFieldValue: option.lockOnFieldValue
            });

            return !!(results && results[0] && results[0].getId());

        },

        /**
         * Utility function to check a parameter value
         * @param {String} val
         */
        requireParam: function (val) {
            if (val === null || val === '') {
                throw nlapiCreateError('ERROR_EMPTY_PARAM', 'Missing required param');
            }
        }

    };
