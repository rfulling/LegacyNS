/**
 * Copyright (c) 1998-2017 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 * Module Description:
 *
 * Multi Queue re-usable script
 * 
 * Version    Date            Author           	Remarks
 * 1.00       31 Mar 2017     ajdeleon 			Initial Development
 *
**/

//encapsulate
var MultiQueue = (function () {

    var script_id,
        main_deployment_parameter_id,
        multi_queue,
        threshold,
        max_number_execution,
        auto_create_deployment,
        main_deployment_id;

    function setDefaultSettings() {
        var context = nlapiGetContext();

        this.script_id = this.script_id || context.getScriptId();
        this.main_deployment_parameter_id = this.main_deployment_parameter_id || '';
        this.multi_queue = this.multi_queue || 5;
        this.threshold = this.threshold || 500;
        this.max_number_execution = this.max_number_execution || 10;
        this.auto_create_deployment = this.auto_create_deployment || false;
        this.main_deployment_id = this.main_deployment_id || this.getDeployment().main_deployment_id;

        return this;
    }

    function getSettings() {
        var objSettings = {
            'script_id': this.script_id,
            'main_deployment_parameter_id': this.main_deployment_parameter_id,
            'multi_queue': this.multi_queue,
            'threshold': this.threshold,
            'max_number_execution': this.max_number_execution,
            'auto_create_deployment': this.auto_create_deployment,
            'main_deployment_id': this.main_deployment_id
        };

        return objSettings;
    }

    function validateRequiredSettings() {
        var objSettings = this.getSettings();
        var stErrorMsg = '';

        for (var key in objSettings) {
            if (objSettings[key] === '' || objSettings[key] == undefined) //get blank values
            {
                stErrorMsg += key + ',';
            }
        }

        //validation for auto create deployment
        if (typeof (objSettings.auto_create_deployment) !== 'boolean') {
            stErrorMsg += 'auto_create_deployment value must be true or false only (boolean)';
        }

        if (stErrorMsg) {
            stErrorMsg = stErrorMsg.slice(0, -1); //remove last character ','
            nlapiLogExecution('DEBUG', 'MULTIQUEUE SETTINGS', JSON.stringify(objSettings));
            throw nlapiCreateError('ERROR_MULTIQUEUE', stErrorMsg + ' - Empty setting value'); //throw error
        }
    }

    function createDeployment(intMainDeploymentId) {
        this.validateRequiredSettings();

        var stNewDeploymentId = '';

        try {
            var recNewDeployment = nlapiCopyRecord('scriptdeployment', intMainDeploymentId); //copy main deployment 
            recNewDeployment.setFieldValue('isdeployed', 'T'); //set field value - isdeployed
            recNewDeployment.setFieldValue('status', 'NOTSCHEDULED'); //set field value - status
            recNewDeployment.setFieldValue(this.main_deployment_parameter_id, 'F'); //set field value - checkbox param

            stNewDeploymentId = nlapiSubmitRecord(recNewDeployment); //create deployment
        }
        catch (e) {
            var stError = (e.getDetails !== undefined) ? (e.getCode() + ': ' + e.getDetails()) : e.toString();
            nlapiLogExecution('ERROR', 'MULTIQUEUE', 'createDeployment failed: ' + stError);
        }

        return stNewDeploymentId;
    }

    function getDeployment() {

        var stScriptId = this.script_id || nlapiGetContext().getScriptId();

        var objReturn = {};
        objReturn.count = 0;
        objReturn.internalids = [];
        objReturn.main_deployment_id = '';

        try {
            var arrFilter = []; //filter column
            arrFilter.push(new nlobjSearchFilter('scriptid', 'script', 'is', stScriptId));
            arrFilter.push(new nlobjSearchFilter('status', null, 'is', 'NOTSCHEDULED'));

            var arrColumn = []; //search column
            arrColumn.push(new nlobjSearchColumn('internalid', 'script'));
            arrColumn.push(new nlobjSearchColumn('scriptid', 'script'));
            arrColumn.push(new nlobjSearchColumn('status'));
            arrColumn.push(new nlobjSearchColumn('internalid').setSort(false));

            var arrResults = nlapiSearchRecord('scriptdeployment', null, arrFilter, arrColumn); //call search

            //if result found
            if ((arrResults !== null) && (arrResults.length > 0)) {

                objReturn.main_deployment_id = arrResults[0].getId(); //get first deployment or main deployment
                objReturn.count = arrResults.length; //get total number of deployments

                //get all deployments
                for (var n = 0; n < arrResults.length; n++) {
                    var stStatus = arrResults[n].getValue('status'); //get status
                    var stDeployInternalId = arrResults[n].getId(); //get deployment id

                    objReturn.internalids.push(stDeployInternalId);
                }
                //end get all deployments
            }
        }
        catch (e) {
            var stError = (e.getDetails !== undefined) ? (e.getCode() + ': ' + e.getDetails()) : e.toString();
            nlapiLogExecution('ERROR', 'MULTIQUEUE', 'getDeployment failed: ' + stError);
        }

        return objReturn;
    }

    function callScheduled(arrDataProcess) {
        this.validateRequiredSettings();

        var intExecutions = 1;
        var intMaxExecutions = this.max_number_execution || 10;

        nlapiLogExecution('DEBUG', 'MULTI QUEUE arrDataProcess', JSON.stringify(arrDataProcess));

        //validate data to process
        if ((arrDataProcess === null) || (arrDataProcess == '') || (arrDataProcess.length <= 0)) {
            return false;
        }


        try {
            /* ------ Call scheduled script ------ */
            do {
                var stStatus = nlapiScheduleScript(this.script_id, null, arrDataProcess);
                var log = '';

                if (stStatus == 'QUEUED') {
                    log = 'success calling scheduled script';
                    break;
                }
                else if (this.auto_create_deployment == true && stStatus != 'QUEUED') {
                    var stNewDeploymentId = this.createDeployment(this.main_deployment_id);
                    log = 'Successfully created new deployment. ID: ' + stNewDeploymentId;
                }
                else {
                    log = 'Failed calling scheduled script. intExecutions: ' + intExecutions +
                        ' | stStatus:' + stStatus +
                        ' | Settings: ' + JSON.stringify(this.getSettings());
                    intExecutions++;
                }

                nlapiLogExecution('DEBUG', 'MULTIQUEUE', log);
            }
            while (intExecutions <= intMaxExecutions);
            /* ------ Call scheduled script ------ */

            if (intExecutions >= intMaxExecutions) {
                nlapiLogExecution('ERROR', 'MULTIQUEUE', 'Max execution exceeded');
                return false;
            }
        }
        catch (e) {
            var stError = (e.getDetails !== undefined) ? (e.getCode() + ': ' + e.getDetails()) : e.toString();
            nlapiLogExecution('ERROR', 'MULTIQUEUE', 'callScheduled failed: ' + stError);
            return false;
        }

        return true;

    }

    return {
        setDefaultSettings: setDefaultSettings,
        validateRequiredSettings: validateRequiredSettings,
        createDeployment: createDeployment,
        getDeployment: getDeployment,
        callScheduled: callScheduled,
        getSettings: getSettings
    };

});