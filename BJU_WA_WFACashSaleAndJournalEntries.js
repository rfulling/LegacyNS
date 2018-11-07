/**
* Copyright (c) 1998-2015 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
*
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
*/

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       28 May 2015     cmargallo
 *
 */

/**
 * @returns {Void} Any or no return value
 */
function workflowAction_createCashSaleAndJournal() {
    var METHOD_NAME = 'workflowAction_createCashSaleAndJournal';
    try {
        nlapiLogExecution('DEBUG', METHOD_NAME, ' - Entry - ');
        // Get the approval status
        var approvalStatus = nlapiGetFieldValue('approvalstatus');
        nlapiLogExecution('DEBUG', METHOD_NAME, 'Approval Status : ' + approvalStatus);
        nlapiLogExecution('DEBUG', METHOD_NAME, 'Walk-In Request : ' + nlapiGetFieldValue('custbody_walkinrequest'));
        // The requisition must be approved or does not require approval
        if ((approvalStatus == '2') || (approvalStatus != '3' && nlapiGetFieldValue('custbody_walkinrequest') == 'T')) {
            // Create a cash sale

            var cashsaleRecID = createCashSale();
            nlapiLogExecution('DEBUG', METHOD_NAME, 'Cashsale Record ID :' + cashsaleRecID);
            // Check the result
            if (cashsaleRecID != null) {
                // Load the cash sale record
                var cashsaleRec = nlapiLoadRecord('cashsale', cashsaleRecID);
                // Create a journal entry
                var journalID = createJournalEntry(cashsaleRec);
                nlapiLogExecution('DEBUG', METHOD_NAME, 'Journal ID: ' + journalID);

                //Set if Storeroom is Successful
                nlapiSetFieldValue('custbody_bju_storeroom_success', 'T');
            }
        }
        nlapiLogExecution('DEBUG', METHOD_NAME, ' - Exit - ');
    } catch (error) {
        throw nlapiCreateError('ERROR', error.message);
        nlapiLogExecution('DEBUG', METHOD_NAME, ' - Exit - ');
    }
}

/**
 * This function create a cash sale record based on the requisition record.
 *
 * @returns {String} cashsaleID Hold the created Cashsale Record ID
 */
function createCashSale() {
    var METHOD_NAME = 'createCashSale';
    nlapiLogExecution('DEBUG', METHOD_NAME, ' - Entry - ');
    // Hold the not found value
    var NOT_FOUND = -1;
    // Hold the new cashsale record ID
    var cashsaleID = null;
    // Hold the cash sale record
    var cashsaleRec = null;
    // Get the context
    var context = nlapiGetContext();
    // Get the Location
    LOCATION = context.getSetting('SCRIPT', 'custscript_location');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Location :' + LOCATION);
    // Get the Customer
    CUSTOMER = context.getSetting('SCRIPT', 'custscript_customer');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Customer :' + CUSTOMER);
    // Get the Subsidiary
    var subsidiary = nlapiGetFieldValue('subsidiary');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Subsidiary : ' + subsidiary);
    // Get the Department
    var department = nlapiGetFieldValue('department');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Department : ' + department);
    // Get the transaction date
    var date = nlapiGetFieldValue('trandate');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Transaction Date : ' + date);
    // Get the line item if the type is 'storeroom'
    // Get Requestor
    var requestor = context.getSetting('SCRIPT', 'custscript_bju_requester');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Requestor :' + requestor);
    // Get Requisition Number
    var requisitionNumber = context.getSetting('SCRIPT', 'custscript_bju_requisition_number');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Requisition Number:' + requisitionNumber);
    //get the requisition ID
    var requisitionID = context.getSetting('SCRIPT', 'custbody_bju_requisition_id');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Requisition Number:' + requisitionNumber);
    // Get Completed check-mark box
    var complete = context.getSetting('SCRIPT', 'custscript_bju_completed');
    // Get Memo
    var memo = context.getSetting('SCRIPT', 'custscript_bju_memo');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Memo :' + memo);


    var footPrint = nlapiGetFieldValue('custbody_request_document_number');
    var projNO = nlapiGetFieldValue('custbody_project_no');
    var deliveryInfo = nlapiGetFieldValue('custbody_delivery_information_body');
    var workORder = nlapiGetFieldValue('custbody_work_order_no');

    for (var index = 1; index <= nlapiGetLineItemCount('item') ; index++) {
        // Hold the item internal id
        var itemInternalID = nlapiGetLineItemValue('item', 'item', index);
        nlapiLogExecution('DEBUG', METHOD_NAME, 'Internal ID :' + itemInternalID);
        if (cashsaleRec == null) {
            // Create a cash sale record
            cashsaleRec = nlapiCreateRecord('cashsale');
            // Set the customer
            cashsaleRec.setFieldValue('entity', CUSTOMER);
            // Set the subsidiary
            cashsaleRec.setFieldValue('subsidiary', subsidiary);
            // Set the department
            cashsaleRec.setFieldValue('department', department);
            // Set the date
            cashsaleRec.setFieldValue('trandate', date);
            // Set the location
            cashsaleRec.setFieldValue('location', LOCATION);
            // Set Requestor
            cashsaleRec.setFieldValue('custbody_requestor', requestor);
            // Set Requisition Number
            cashsaleRec.setFieldValue('custbody_bju_requisition_number', requisitionNumber);
            // Set Completed check-box
            cashsaleRec.setFieldValue('custbody2', complete);
            // Set Memo
            cashsaleRec.setFieldValue('memo', memo);

            cashsaleRec.setFieldValue('custbody_request_document_number', footPrint);
            cashsaleRec.setFieldValue('custbody_project_no', projNO);
            cashsaleRec.setFieldValue('custbody_delivery_information_body', deliveryInfo);
            cashsaleRec.setFieldValue('custbody_work_order_no', workORder);

        }
        // Create a line item
        cashsaleRec.selectNewLineItem('item');
        cashsaleRec.setCurrentLineItemValue('item', 'item', itemInternalID);
        cashsaleRec.setCurrentLineItemValue('item', 'quantity', nlapiGetLineItemValue('item', 'quantity', index));
        cashsaleRec.setCurrentLineItemValue('item', 'department', nlapiGetLineItemValue('item', 'department', index));
        cashsaleRec.setCurrentLineItemValue('item', 'amount', nlapiGetLineItemValue('item', 'amount', index));
        cashsaleRec.setCurrentLineItemValue('item', 'description', nlapiGetLineItemValue('item', 'description', index));
        cashsaleRec.commitLineItem('item');
    }
    // Submit the cash sale record
    cashsaleID = nlapiSubmitRecord(cashsaleRec, true);
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Return Value : ' + cashsaleID);
    nlapiLogExecution('DEBUG', METHOD_NAME, ' - Exit - ');
    return cashsaleID;
}

/**
 * This function create a journal entry based on the newly create cash sale
 *
 * @param {String} cashsaleRec Hold the newly created Cashsale Record
 * @returns {String}  journalEntryID Hold the created Journal Record ID
 */
function createJournalEntry(cashsaleRec) {
    var METHOD_NAME = 'createJournalEntry';
    nlapiLogExecution('DEBUG', METHOD_NAME, ' - Entry - ');
    // Hold the new journal ID
    var journalID = null;
    // Hold the journal record
    var journalRec = null;
    // Get the context
    var context = nlapiGetContext();
    // Get the sale total account
    var totalSale = cashsaleRec.getFieldValue('total');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Total Sale : ' + totalSale);
    // Get the Cash Account
    CASH_ACCOUNT = context.getSetting('SCRIPT', 'custscript_cash_account');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Cash Account :' + CASH_ACCOUNT);
    // Get the Other Revenue Account
    OTHER_REVENUE_ACCOUNT = context.getSetting('SCRIPT', 'custscript_other_revenue_account');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Other Revenue Account :' + OTHER_REVENUE_ACCOUNT);
    // Get the Supplies Expense Account
    SUPPLIES_EXPENSE_ACCOUNT = context.getSetting('SCRIPT', 'custscript_supplies_expense_account');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Supplies Expense Account :' + SUPPLIES_EXPENSE_ACCOUNT);
    // Get the Cost of Goods Sold Account (COGS)
    COGS_ACCOUNT = context.getSetting('SCRIPT', 'custscript_cogs_account');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'COGS Account :' + COGS_ACCOUNT);
    // Get the Subsidiary
    var subsidiary = cashsaleRec.getFieldValue('subsidiary');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Subsidiary : ' + subsidiary);
    // Get the Date
    var transDate = cashsaleRec.getFieldValue('trandate');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Trans Date : ' + transDate);
    // Get the Posting Period
    var postingPeriod = cashsaleRec.getFieldValue('postingperiod');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Posting Period : ' + postingPeriod);
    // Get the Department
    var department = cashsaleRec.getFieldValue('department');
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Department : ' + department);
    // Create a Journal record
    journalRec = nlapiCreateRecord('journalentry', { recordmode: 'dynamic' });
    // Set the subsidiary
    journalRec.setFieldValue('subsidiary', subsidiary);
    // Set the Date
    journalRec.setFieldValue('trandate', transDate);
    // Get the Posting Period
    journalRec.setFieldValue('postingperiod', postingPeriod);
    // Create a lines for Cash Account
    journalRec.selectNewLineItem('line');
    journalRec.setCurrentLineItemValue('line', 'account', CASH_ACCOUNT);
    journalRec.setCurrentLineItemValue('line', 'credit', totalSale);
    journalRec.setCurrentLineItemValue('line', 'department', department);
    journalRec.commitLineItem('line');
    // Create a lines for Other Revenue Account
    //Other Revenue account is now 1475 Inventory
    //  journalRec.selectNewLineItem('line');
    // journalRec.setCurrentLineItemValue('line', 'account', OTHER_REVENUE_ACCOUNT);
    //journalRec.setCurrentLineItemValue('line', 'credit', totalSale);
    //journalRec.setCurrentLineItemValue('line', 'department', department);
    //journalRec.commitLineItem('line');
    // Create a lines for Supplies Expense Account
    journalRec.selectNewLineItem('line');
    journalRec.setCurrentLineItemValue('line', 'account', SUPPLIES_EXPENSE_ACCOUNT);
    journalRec.setCurrentLineItemValue('line', 'debit', totalSale);
    journalRec.setCurrentLineItemValue('line', 'department', department);
    journalRec.commitLineItem('line');
    // Create a lines for Supplies Expense Account
    //journalRec.selectNewLineItem('line');
    //journalRec.setCurrentLineItemValue('line', 'account', COGS_ACCOUNT);
    //journalRec.setCurrentLineItemValue('line', 'debit', totalSale);
    //journalRec.setCurrentLineItemValue('line', 'department', department);
    //journalRec.commitLineItem('line');
    // Submit the Journal Entry record
    journalID = nlapiSubmitRecord(journalRec);
    nlapiLogExecution('DEBUG', METHOD_NAME, 'Return Value : ' + journalID);
    nlapiLogExecution('DEBUG', METHOD_NAME, ' - Exit - ');
    return journalID;
}

/**
* Check if a data is empty
* @param stValue (string) value to check
* @returns {Boolean}
*/
function isEmpty(stValue) {
    var mResult = false;
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        mResult = true;
    }
    return mResult;
}