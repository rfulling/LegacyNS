/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 */

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       July 07, 2016    awarty		Initial version.
 *
 */

STR_LOG_TITLE = "Backend (Suitelet): Set Rev Rec Value";
CONTEXT = nlapiGetContext();
var SCRIPTPARAM_PROJTOPROCESS = CONTEXT.getSetting('SCRIPT', 'custscript_project_type');


/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */
function suitelet_calculate(request, response) {


    try {

        var strExecutionContext = CONTEXT.getExecutionContext();


        var objResponse = {};

        if (request.getMethod() == 'GET') {
            var strRecordId = request.getParameter('id');
            var strRecordType = request.getParameter('type');
            objResponse = calcRevRecValue(strRecordType, strRecordId);
        }
        response.write(JSON.stringify(objResponse));


    } catch (e) {


        var objResponse = {};
        objResponse.result = false;
        if (e.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', e.getCode() + ': ' + e.getDetails());
            objResponse.info = 'Calculation Failed. \n';
            objResponse.info += 'EXECUTION ERROR (' + e.getCode() + ')' + ': ' + e.getDetails();
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', e.toString());
            objResponse.info = 'UNEXPECTED ERROR' + ': ' + e.toString();
        }
        response.write(JSON.stringify(objResponse));
    } finally {

    }
}
function calcRevRecValue(strRecordType, strRecordId) {
    try {

        var record = nlapiLoadRecord(strRecordType, strRecordId, { recordmode: 'dynamic' });
        var iptdRevRecFee = getRevRecAmount(record);
        record.setFieldValue('custentity_apco_ptd_rev_rec_or_value', iptdRevRecFee);
        var idRec = nlapiSubmitRecord(record);
    } catch (e) {
        throw e;
    }
}


function getRevRecAmount(record) {

    // var myproj = nlapiLoadRecord('job', 4379);
    //  var ptdActualFee = myproj.getFieldValue('custentity_apco_ptd_actual_fee');
    var jobid = record.getId();
    var periodId = record.getFieldValue('custentity_apco_proj_period')


    var ptdActualFee = record.getFieldValue('custentity_apco_ptd_actual_fee');
    var projectType = record.getFieldValue('jobtype')
    var ptdOOP = record.getFieldValue('custentity_apco_ptd_actual_oop');

    //search for the project budget and the PTD actual fee which is the result of the search called Apco Value of Time V2
    //internal id fo the search is customsearch256

    // Calc1 = (posting period PTD Budget Total Project Value less PTD Actual OOP); if Calc1
    // is greater or equal to PTD Actual value of time, take PTD Actual value of time, otherwise take PTD Budget FEE
    var arrFilters = [];
    var arrColumns = [];

    arrFilters.push(new nlobjSearchFilter('custrecord_apco_project', null, 'is', jobid));
    arrFilters.push(new nlobjSearchFilter('custrecord_period', null, 'is', periodId));
    arrColumns.push(new nlobjSearchColumn('custrecord_apco_cum_budget_fee', null, 'sum'));

    var cumulativeBudget = nlapiSearchRecord('customrecord_apco_proj_budget', null, arrFilters, arrColumns);

    if (cumulativeBudget) {
        var ptdBudgetTotal = cumulativeBudget[0].getValue('custrecord_apco_cum_budget_fee', null, 'sum');
    }

    //now get the project to date
    //if the project type is 
    //retainer plus cum budget fee
    //all others are  fee + ops
    //this is for retainer plus
    //Variable is for Retainer plus which does not use oop to calculate the revenue fee.
    if (projectType == SCRIPTPARAM_PROJTOPROCESS) {

        var ptdRevRecFee = (ptdBudgetTotal) != null ? (parseInt(ptdBudgetTotal) > parseInt(ptdActualFee)) ? ptdActualFee : ptdBudgetTotal : ptdActualFee;
    } else {

        var ptdRevRecFee = (parseInt(ptdBudgetTotal) - parseInt(ptdOOP)) != null ? (parseInt(ptdBudgetTotal) - parseInt(ptdOOP)) > parseInt(ptdActualFee) ? ptdActualFee : ptdBudgetTotal : ptdActualFee;
    }
    nlapiSubmitField('job', jobid, 'custentity_apco_ptd_rev_rec_or_value', ptdRevRecFee);

    return ptdRevRecFee;

}