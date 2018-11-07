/**
 * Copyright (c) 1998-2015 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite. Module Description
 * 
 * Version Date Author Remarks 1.00 28 Oct 2015 jburgos
 */

function createJobsTasks(type) {

    var stLoggerTitle = 'afterSubmit_createExchangeOrder';
    //var funcMisc = new misc();
    var context = nlapiGetContext();

  

    // Script parameter
    /*
    var status = context.getSetting('SCRIPT', 'custscript_dwr_status');
    var fulfilled_location = context.getSetting('SCRIPT', 'custscript_dwr_fulfilled_location');
    var ship_method = context.getSetting('SCRIPT', 'custscript_dwr_ship_method');
    var paramReturnType = context.getSetting('SCRIPT', 'custscript_dwr_return_type');
    var tax_item_usd = context.getSetting('SCRIPT', 'custscript_dwr_tax_usd');
    var tax_item_cad = context.getSetting('SCRIPT', 'custscript_dwr_tax_cad');
    var tax_item = context.getSetting('SCRIPT', 'custscript_dwr_tax_item');
    var currency_usd = context.getSetting('SCRIPT', 'custscript_dwr_currency_usd');
    var currency_cad = context.getSetting('SCRIPT', 'custscript_dwr_currency_cad');
    var credit_item = context.getSetting('SCRIPT', 'custscript_dwr_credit_item');

    var payment_method = context.getSetting('SCRIPT', 'custscript_dwr_exorder_pay_method');
    var approval_status = context.getSetting('SCRIPT', 'custscript_dwr_exorder_approval_status');


    if (funcMisc.isEmpty(status) || funcMisc.isEmpty(fulfilled_location)
            || funcMisc.isEmpty(ship_method)
            || funcMisc.isEmpty(paramReturnType)
            || funcMisc.isEmpty(credit_item)
            || funcMisc.isEmpty(tax_item_usd)
            || funcMisc.isEmpty(tax_item_cad) || funcMisc.isEmpty(tax_item)
            || funcMisc.isEmpty(currency_usd)
            || funcMisc.isEmpty(currency_cad)) {
        nlapiLogExecution('DEBUG', stLoggerTitle,
                '>> Exit script execution. Script parameters must be set. <<');
        return;
    }
    */

    //loop through the estimate lines
    //for now open the sales order can change to nlapi later
    var so = nlapiLoadRecord('salesorder', 213520)
    var lineCount = so.getLineItemCount('item');
    var jParent =so.getFieldValue('entity');
    var jName = so.getFieldText('entity');
    var jType = 5;//so.getFieldValue('')
    var sellPrice = 10000; //custentity_ivc_est_job_sell_price
    var projOffice = 2;//custentity_projectoffice
    var projManager = 2082; //custentity_projectmgr
    var closeDate = new Date('03/31/2016');//custentity_ivc_estimated_job_close_date
    closeDate = nlapiDateToString(closeDate);
    var actMgr = 2082;//custentity_ivc_account_manager
    var expType = 1; //projectexpensetype
    var jobStatus = 1;//entitystatus

    for (var i = 1; i < lineCount; i++) {
        //get the varialbes I need from each line
        var type = so.getLineItemValue('item', 'itemtype', i);
        var inGroup = so.getLineItemValue('item', 'ingroup', i);
          //if type='service and in group ='f' create job

        if (type == 'Service' && inGroup == null) {
            var lineJob = createJob(sellPrice, projOffice, projManager, closeDate, actMgr, expType, jobStatus,jName, jParent,jType)
            so.setLineItemValue('item', 'job', i, lineJob);
        }
        if (type == 'Group') {
            //create a milestone for this job.
            var taskName = so.getLineItemText('item', 'item', i);
            createTaskMilestone(lineJob, taskName,'T',null);
            so.setLineItemValue('item', 'job', i, lineJob);
        }
        if (inGroup == 'T' && type !='EndGroup'){
            //create a task 
            var taskName = so.getLineItemText('item', 'item', i);
            createTaskMilestone(lineJob, taskName, 'F', 140);
            so.setLineItemValue('item', 'job', i, lineJob);
        }
        
    }
    nlapiSubmitRecord(so);
}


function createJob(sellPrice, projOffice, projManager, closeDate, actMgr, expType, jobStatus, jName, jParent,jType) {

    var newJob = nlapiCreateRecord('job');
    newJob.setFieldValue('custentity_ivc_est_job_sell_price', sellPrice);
    newJob.setFieldValue('custentity_projectoffice', projOffice);
    newJob.setFieldValue('custentity_projectmgr', projManager);
    newJob.setFieldValue('custentity_ivc_estimated_job_close_date', closeDate);
    newJob.setFieldValue('custentity_ivc_account_manager', actMgr);
    newJob.setFieldValue('projectexpensetype', expType);
    newJob.setFieldValue('entitystatus', jobStatus);
    newJob.setFieldValue('companyname', jName);
    newJob.setFieldValue('parent', jParent);
    newJob.setFieldValue('jobtype', jType);

    var jobId = nlapiSubmitRecord(newJob);

    return jobId;

}

function createTaskMilestone(jobId, taskName,isMileStone,estimatedWork) {
    var projTask = nlapiCreateRecord('projecttask', { company: jobId });
    projTask.setFieldValue('title', taskName);
    projTask.setFieldValue('ismilestone', isMileStone);
    projTask.setFieldValue('estimatedwork', estimatedWork);
    nlapiSubmitRecord(projTask);

}