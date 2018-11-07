/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

var CONTEXT = nlapiGetContext();

function workflowAction_triggerUE() {
    var retValue = "T";

    try {
        var stVendorId = CONTEXT.getSetting('SCRIPT', 'custscript_apco_interco_vendor'); // - 6/10/2016
        nlapiLogExecution('DEBUG', 'stVendorId', stVendorId);

        var record = nlapiGetNewRecord();
        nlapiLogExecution('DEBUG', 'id', record);

        var tranType = record.getRecordType();
        nlapiLogExecution('DEBUG', 'type', tranType);

        var tranid = nlapiGetRecordId();
        nlapiLogExecution('DEBUG', 'type', tranid);

        if (tranType == 'vendorbill' || tranType == 'expensereport') {
            var rec = nlapiLoadRecord(tranType, tranid);

            var stEntity = rec.getFieldValue('entity');
            nlapiLogExecution('DEBUG', 'Entity', stEntity + ' | ' + stVendorId);

            if (stEntity == stVendorId) {
                nlapiLogExecution('DEBUG', 'RETURNED', 'Returned');
                return retValue;
            }

            var stRecICJE = rec.getFieldValue('custbody_apco_journal_revenue');
            var stRecVB = rec.getFieldValue('custbody_vendor_bill');

            nlapiLogExecution('DEBUG', 'Check Trans', stRecVB + ' | ' + stRecICJE);

            if (stRecICJE || stRecVB) {
                nlapiLogExecution('DEBUG', 'RETURNED', 'Returned');
                return retValue;
            }

            rec.setFieldValue('approvalstatus', '2');

            nlapiSubmitRecord(rec, false, true);
            nlapiLogExecution('DEBUG', 'SUBMITTED', 'Submitted');

            // nlapiSetRedirectURL('RECORD', tranType, tranid, false);
            return retValue;
        }
    }
    catch (error) {

        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            //throw error;
        }
        else {
            //return retValue;
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            //throw nlapiCreateError('99999', error.toString());

        }

        return retValue;

    }
    //return retValue;
}
