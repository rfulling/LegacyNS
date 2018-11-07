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
 * Module Description - Intercompany Invoices and Bills
 *
 * Version      Date              Author            Remarks
 * 1.00         04/19/2016        mjpascual       Initial version.
 * 1.10         10/28/2016          mjpascual           Changes based on Lisa's email
 *
 */

var CONTEXT = nlapiGetContext();

var INT_USAGE_LIMIT_THRESHOLD = 5000;
var INT_START_TIME = new Date().getTime();

var ARR_ERROR_DETAILS = [];
var ARR_FAILED_ACCT = [];
var OBJ_PROCESSED = {};
var OBJ_PARAM = {};
var OBJ_SUBSIDIARY = {};
var ST_TRAN_DATE = '';
var ST_FROM_CURRENCY = '';
var ST_NEXT_PD = '';
var ST_BY_DATE = '';
var ST_FROM_DATE = '';
var ST_TO_DATE = '';

/**
 * TDD 5: Intercompany Invoices and Bills
 * @param type
 */
function scheduled_unbilledBalances(type) {
    try {
        var stLogTitle = 'scheduled_unbilledBalances';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        //Get script paramaters
        OBJ_PARAM.stParamAcctsToProcess = CONTEXT.getSetting('SCRIPT', 'custscript_sc_unbilled');
        OBJ_PARAM.stParamFromSubsidiary = CONTEXT.getSetting('SCRIPT', 'custscript_sc_from_subsidiary');
        OBJ_PARAM.stParamPeriod = CONTEXT.getSetting('SCRIPT', 'custscript_sc_period');
        OBJ_PARAM.stParamRealizedFXGLAcct = CONTEXT.getSetting('SCRIPT', 'custscript_sc_realized_gl_acct');
        OBJ_PARAM.stParamUnbilledSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_sc_search_unbilled');
        OBJ_PARAM.stParamUnbilledDetailsSumSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_sc_search_unbilled_sum');
        OBJ_PARAM.stParamUnbilledDetailsSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_sc_search_unbilled_det');
        OBJ_PARAM.stParamJEgl = CONTEXT.getSetting('SCRIPT', 'custscript_sc_search_je_gl');
        OBJ_PARAM.stParamJEgl2 = CONTEXT.getSetting('SCRIPT', 'custscript_sc_search_je_gl2');
        OBJ_PARAM.stParamApprStatus = CONTEXT.getSetting('SCRIPT', 'custscript_appr_status');
        OBJ_PARAM.stParamTemplateExcel = CONTEXT.getSetting('SCRIPT', 'custscript_sc_excel_temp');
        OBJ_PARAM.stParamFolderId = CONTEXT.getSetting('SCRIPT', 'custscript_sc_folder');
        OBJ_PARAM.stParamTaxAcct = CONTEXT.getSetting('SCRIPT', 'custscript_sc_taxacct');
        ST_BY_DATE = CONTEXT.getSetting('SCRIPT', 'custscript_sc_bydate');
        ST_FROM_DATE = CONTEXT.getSetting('SCRIPT', 'custscript_sc_fromdate');
        ST_TO_DATE = CONTEXT.getSetting('SCRIPT', 'custscript_sc_todate');

        if (!OBJ_PARAM.stParamPeriod) OBJ_PARAM.stParamPeriod = '0';

        nlapiLogExecution('DEBUG', stLogTitle, 'ST_BY_DATE =' + ST_BY_DATE + ' | ST_FROM_DATE =' + ST_FROM_DATE + ' | ST_TO_DATE =' + ST_TO_DATE);


        OBJ_PARAM.stDefaultVBForm = CONTEXT.getSetting('SCRIPT', 'custscript_def_vb_form');

        //Validate script parameters
        validateScriptParamObj();

        if (ST_BY_DATE == 'T') {
            ST_TRAN_DATE = ST_TO_DATE;
        }
        else {
            //      ST_FROM_CURRENCY = nlapiLookupField('subsidiary', OBJ_PARAM.stParamFromSubsidiary, 'currency');
            ST_TRAN_DATE = nlapiLookupField('accountingperiod', OBJ_PARAM.stParamPeriod, 'enddate');
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'ST_TRAN_DATE =' + ST_TRAN_DATE);
        var dTranDate = nlapiStringToDate(ST_TRAN_DATE);
        var dNextDay = nlapiAddDays(dTranDate, 1);
        var stNextDay = nlapiDateToString(dNextDay);
        nlapiLogExecution('DEBUG', stLogTitle, 'stNextDay =' + stNextDay);

        //Search for next period id
        var arrNextPd = searchAcctPeriod(stNextDay);
        if (Eval.isEmpty(arrNextPd)) {
            throw nlapiCreateError('CANNOT_FIND_NEXT_PD', 'Start date does not exist on the accounting period -> ' + stNextDay);
        }

        ST_NEXT_PD = arrNextPd[0].getId();
        nlapiLogExecution('DEBUG', stLogTitle, 'ST_NEXT_PD =' + ST_NEXT_PD);

        //Split arrays
        var arrAcctsToProcess = OBJ_PARAM.stParamAcctsToProcess.split(',');
        nlapiLogExecution('DEBUG', stLogTitle, 'arrAcctsToProcess =' + arrAcctsToProcess);

        var objAccts = getAccountObjects(arrAcctsToProcess);

        var arrUnbilledSearchResult = searchUnbilledList(arrAcctsToProcess, OBJ_PARAM.stParamUnbilledSavedSearch);

        for (var intCtr = 0; intCtr < arrUnbilledSearchResult.length; intCtr++) {

            //Getter
            var objUnbilled = arrUnbilledSearchResult[intCtr];

            //Setter
            var objUnbilledData = {};
            objUnbilledData.stAcctText = objUnbilled.getText('account', null, 'group');
            objUnbilledData.stAcctId = objUnbilled.getValue('account', null, 'group');

            nlapiLogExecution('DEBUG', stLogTitle, 'objUnbilledData.stAcctId =' + objUnbilledData.stAcctId);

            if (!Eval.isEmpty(objAccts[objUnbilledData.stAcctId])) {
                var objAcct = objAccts[objUnbilledData.stAcctId];
                objUnbilledData.stToSubsidiary = objAcct._to_sub;
                objUnbilledData.stClient = objAcct._ic_client;
                objUnbilledData.stVendor = objAcct._ic_vendor;
                objUnbilledData.stItem = objAcct._ic_item;
                objUnbilledData.stVBItem = objAcct._ic_vb_item;
                objUnbilledData.stAPAcct = objAcct._ap_account;
            }
            else {
                nlapiLogExecution('ERROR', stLogTitle, 'ER-0000: Cannot found from subsidiary #' + OBJ_PARAM.stParamFromSubsidiary + ' and acct ' + objUnbilledData.stAcctText + ' in InterCompany Client Vendor Chart');
                ARR_ERROR_DETAILS.push('ER-0000: Cannot found from subsidiary #' + OBJ_PARAM.stParamFromSubsidiary + ' and acct ' + objUnbilledData.stAcctText + ' in InterCompany Client Vendor Chart');
                continue;
            }

            var arrAcctDetailListResult = searchUnbilledDetailList(objUnbilledData.stAcctId, OBJ_PARAM.stParamUnbilledDetailsSumSavedSearch);
            for (var intDetailCtr = 0; intDetailCtr < arrAcctDetailListResult.length; intDetailCtr++) {
                nlapiLogExecution('DEBUG', stLogTitle, 'intDetailCtr =' + intDetailCtr);

                var objUnbilledDetail = arrAcctDetailListResult[intDetailCtr];
                var flAmt = Parse.forceFloat(objUnbilledDetail.getValue('formulacurrency', null, 'SUM'));

                nlapiLogExecution('DEBUG', stLogTitle, 'flAmt =' + flAmt);

                objUnbilledData.stEntity = objUnbilledDetail.getText('custcol_apco_ic_project', null, 'GROUP');
                objUnbilledData.stEntityId = objUnbilledDetail.getValue('custcol_apco_ic_project', null, 'GROUP');
                objUnbilledData.stSubId = objUnbilledDetail.getValue('subsidiary', null, 'GROUP');
                objUnbilledData.stSubsidiaryCurrency = objUnbilledDetail.getValue('currency', 'subsidiary', 'GROUP');
                objUnbilledData.stProjectCurrency = objUnbilledDetail.getValue('currency', 'custcol_apco_ic_project', 'GROUP');

                nlapiLogExecution('DEBUG', stLogTitle, 'objUnbilledData =' + JSON.stringify(objUnbilledData));

                var flExchangerate = nlapiExchangeRate(objUnbilledData.stProjectCurrency, objUnbilledData.stSubsidiaryCurrency, nlapiDateToString(new Date()));
                if (objUnbilledData.stToSubsidiary == 31 || objUnbilledData.stToSubsidiary == 37) {
                    objUnbilledData.stAmt = parseInt(flAmt / flExchangerate);
                }
                else {
                    objUnbilledData.stAmt = (flAmt / flExchangerate).toFixed(2);
                }

                nlapiLogExecution('DEBUG', stLogTitle, 'objUnbilledData.stAmt =' + objUnbilledData.stAmt + ' | flExchangerate =' + flExchangerate);


                if (objUnbilledData.stEntity == '-NONE-') {
                    objUnbilledData.stEntityId = '@NONE@';
                }

                nlapiLogExecution('DEBUG', stLogTitle, 'objUnbilledData =' + JSON.stringify(objUnbilledData));

                var objInv = {};
                objInv.stInvId = '';
                objInv.flTax = '';

                var stVBId = '';
                var stCMId = '';
                var stBCId = '';
                if (Parse.forceFloat(objUnbilledData.stAmt) > 0) {
                    //Create Intercompany Invoice
                    objInv = createIntercompanyInvoice(objUnbilledData, objInv);

                    //Create an Intercompany Vendor Bill
                    stVBId = createIntercompanyVB(objUnbilledData, objInv.flTax, objInv.stInvNum);

                }
                else {
                    //Create a Credit memo
                    stCMId = createCreditMemo(objUnbilledData);

                    //Create a Bill credit
                    stBCId = createBillCredit(objUnbilledData, stCMId);
                }

                //Link transaction references
                nlapiLogExecution('DEBUG', stLogTitle, 'Link transactions. OBJ_PROCESSED =' + JSON.stringify(OBJ_PROCESSED));

                //Create File
                if (!Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId])) {
                    createFile(objUnbilledData.stAcctId, objUnbilledData.stEntityId, objInv.stInvId, stVBId, stCMId, stBCId);
                }

            }

            //Create a Journal Entry for GL adj
            //  createJournal(objUnbilledData);

            //Monitor usage unit / time run
            INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'ARR_FAILED_ACCT =' + ARR_FAILED_ACCT);
        nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_PROCESSED=' + JSON.stringify(OBJ_PROCESSED));


        //Reverse Failed Transactions
        reverseFailedTransactions();

        //Send email upon completion
        sendEmail();

        nlapiLogExecution('DEBUG', stLogTitle, '>> Exit Log <<');
    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }

}


/**
* Creates the Excel File that will be attached on the record
* @param stAcctId
* @param stEntityId
* @param stInvId
* @param stVBId
* @param stCMId
* @param stBCId
*/
function createFile(stAcctId, stEntityId, stInvId, stVBId, stCMId, stBCId) {
    var stLogTitle = 'scheduled_unbilledBalances.createFile';
    nlapiLogExecution('DEBUG', stLogTitle, '-- Entering  function --');

    //Template
    var objFileXMLTemplate = nlapiLoadFile(OBJ_PARAM.stParamTemplateExcel);
    if (Eval.isEmpty(objFileXMLTemplate)) {
        throw nlapiCreateError('ERR_USER_ERROR', 'Template not found.');
    }
    var stXMLtemplateContent = objFileXMLTemplate.getValue();

    nlapiLogExecution('DEBUG', stLogTitle, 'stXMLtemplateContent =' + stXMLtemplateContent);

    var objRenderer = nlapiCreateTemplateRenderer();
    objRenderer.setTemplate(stXMLtemplateContent);

    var arrAcctDetailListResult = searchUnbilledDetailList(stAcctId, OBJ_PARAM.stParamUnbilledDetailsSavedSearch, stEntityId);

    if (Eval.isEmpty(arrAcctDetailListResult)) {
        nlapiLogExecution('DEBUG', stLogTitle, 'No details found');
    }

    //load the searches
    objRenderer.addSearchResults('acctdetails', arrAcctDetailListResult);

    //render the object
    var stXMLcontent = objRenderer.renderToString();
    nlapiLogExecution('DEBUG', stLogTitle, 'stXMLcontent =' + stXMLcontent);

    //create Excel
    try {
        //filename
        var stCreationDate = nlapiDateToString(new Date());
        stCreationDate = stCreationDate.replace(/\//g, '') + '_' + new Date().getTime();
        var stFileName = stAcctId + '-' + stCreationDate + '.xls';

        //create excel
        var objExcel = nlapiCreateFile(stFileName, 'EXCEL', nlapiEncrypt(stXMLcontent, 'base64'));
        objExcel.setFolder(OBJ_PARAM.stParamFolderId);

        //submit file to the netsuite folder specified in the script param.
        var stFileId = nlapiSubmitFile(objExcel);
        nlapiLogExecution('DEBUG', stLogTitle, 'stFileId =' + stFileId);

        //Attach file to the transactions
        if (!Eval.isEmpty(stInvId)) {
            nlapiAttachRecord('file', stFileId, 'invoice', stInvId);
            nlapiLogExecution('DEBUG', stLogTitle, 'File attached to invoice #' + stInvId);
        }

        if (!Eval.isEmpty(stVBId)) {
            nlapiAttachRecord('file', stFileId, 'vendorbill', stVBId);
            nlapiLogExecution('DEBUG', stLogTitle, 'File attached to VB #' + stVBId);
        }

        if (!Eval.isEmpty(stCMId)) {
            nlapiAttachRecord('file', stFileId, 'creditmemo', stCMId);
            nlapiLogExecution('DEBUG', stLogTitle, 'File attached to CM #' + stCMId);
        }

        if (!Eval.isEmpty(stBCId)) {
            nlapiAttachRecord('file', stFileId, 'vendorcredit', stBCId);
            nlapiLogExecution('DEBUG', stLogTitle, 'File attached to BC #' + stBCId);
        }
    }
    catch (err) {
        throw nlapiCreateError('ERR_EXCEL_FILE', 'Problem generating the Excel File: ' + err.toString());
    }
}


/**
* Reverse Failed Transactions
*/
function reverseFailedTransactions() {
    var stLogTitle = 'scheduled_unbilledBalances.reverseFailedTransactions';
    nlapiLogExecution('DEBUG', stLogTitle, 'ARR_FAILED_ACCT =' + ARR_FAILED_ACCT);

    for (var intCtrId = 0; intCtrId < ARR_FAILED_ACCT.length; intCtrId++) {
        var stAcctId = ARR_FAILED_ACCT[intCtrId];
        if (!Eval.isEmpty(OBJ_PROCESSED[stAcctId])) {
            if (!Eval.isEmpty(OBJ_PROCESSED[stAcctId].stJEId)) {
                try {
                    nlapiDeleteRecord('journalentry', OBJ_PROCESSED[stAcctId].stJEId);
                    nlapiLogExecution('AUDIT', stLogTitle, 'Deleted JE #' + OBJ_PROCESSED[stAcctId].stJEId);
                }
                catch (err) {

                }
            }
            if (!Eval.isEmpty(OBJ_PROCESSED[stAcctId].arrInvId)) {
                for (var intTranCtr = 0; intTranCtr < OBJ_PROCESSED[stAcctId].arrInvId.length; intTranCtr++) {
                    try {
                        var stInvId = OBJ_PROCESSED[stAcctId].arrInvId[intTranCtr];

                        nlapiDeleteRecord('invoice', stInvId);
                        nlapiLogExecution('AUDIT', stLogTitle, 'Deleted Inv #' + stInvId);
                    }
                    catch (err) {
                        continue;
                    }
                }
            }
            if (!Eval.isEmpty(OBJ_PROCESSED[stAcctId].arrVBId)) {
                for (var intTranCtr = 0; intTranCtr < OBJ_PROCESSED[stAcctId].arrVBId.length; intTranCtr++) {
                    try {
                        var stVBId = OBJ_PROCESSED[stAcctId].arrVBId[intTranCtr];
                        nlapiDeleteRecord('vendorbill', stVBId);
                        nlapiLogExecution('AUDIT', stLogTitle, 'Deleted VB #' + stVBId);
                    }
                    catch (err) {
                        nlapiLogExecution('ERROR', stLogTitle, 'Failed To Delete VB:' + stVBId);
                        nlapiLogExecution('ERROR', stLogTitle, err.toString());
                        continue;
                    }
                }
            }

            if (!Eval.isEmpty(OBJ_PROCESSED[stAcctId].arrCM)) {
                for (var intTranCtr = 0; intTranCtr < OBJ_PROCESSED[stAcctId].arrCM.length; intTranCtr++) {
                    try {
                        var stCMId = OBJ_PROCESSED[stAcctId].arrCM[intTranCtr];
                        nlapiDeleteRecord('creditmemo', stCMId);
                        nlapiLogExecution('AUDIT', stLogTitle, 'Deleted CM #' + stCMId);
                    }
                    catch (err) {
                        continue;
                    }
                }
            }

            if (!Eval.isEmpty(OBJ_PROCESSED[stAcctId].arrBC)) {
                for (var intTranCtr = 0; intTranCtr < OBJ_PROCESSED[stAcctId].arrBC.length; intTranCtr++) {
                    try {
                        var stBCId = OBJ_PROCESSED[stAcctId].arrBC[intTranCtr];
                        nlapiDeleteRecord('vendorcredit', stBCId);
                        nlapiLogExecution('AUDIT', stLogTitle, 'Deleted BC #' + stBCId);
                    }
                    catch (err) {
                        continue;
                    }
                }
            }
        }

        //Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }

}

/**
 * Validate script parameters
 */
function validateScriptParamObj() {
    var stLogTitle = 'scheduled_unbilledBalances.validateScriptParamObj';

    nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_PARAM = ' + JSON.stringify(OBJ_PARAM));

    for (var stKeyParam in OBJ_PARAM) {
        if (Eval.isEmpty(OBJ_PARAM[stKeyParam])) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }
    }
}

/**
 * Create the Intercompany Invoice
 * @param objUnbilledData
 * @param objInv
 * @returns objInv
 */
function createIntercompanyInvoice(objUnbilledData, objInv) {
    var stLogTitle = 'scheduled_unbilledBalances.createIntercompanyInvoice';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter createIntercompanyInvoice');

    try {
        var recIntercoInv = nlapiCreateRecord('invoice',
            {
                recordmode: 'dynamic'
            });
        recIntercoInv.setFieldValue('entity', objUnbilledData.stClient); //Customer
        recIntercoInv.setFieldValue('subsidiary', OBJ_PARAM.stParamFromSubsidiary); //From Subsidiary
        //recIntercoInv.setFieldValue('trandate', ST_TRAN_DATE); //Transaction Date
        recIntercoInv.setFieldValue('currency', objUnbilledData.stProjectCurrency);
        recIntercoInv.setFieldValue('custbody_is_interco_adj', 'T');
        recIntercoInv.setFieldValue('approvalstatus', OBJ_PARAM.stParamApprStatus);

        //Line Item
        recIntercoInv.selectNewLineItem('item');
        recIntercoInv.setCurrentLineItemValue('item', 'item', objUnbilledData.stItem);
        recIntercoInv.setCurrentLineItemValue('item', 'description', objUnbilledData.stEntity);
        recIntercoInv.setCurrentLineItemValue('item', 'quantity', 1);
        recIntercoInv.setCurrentLineItemValue('item', 'amount', objUnbilledData.stAmt);
        recIntercoInv.commitLineItem('item');

        objInv.stInvId = nlapiSubmitRecord(recIntercoInv, false, true);

        if (!Eval.isEmpty(objInv.stInvId)) {
            var recIntercoInv2 = nlapiLoadRecord('invoice', objInv.stInvId);
            objInv.stInvNum = recIntercoInv2.getFieldValue('tranid');
            if (!Eval.isEmpty(recIntercoInv2)) {
                //Get Tax
                objInv.flTax = recIntercoInv2.getLineItemValue('item', 'tax1amt', 1);
                nlapiLogExecution('DEBUG', stLogTitle, 'objInv.flTax =' + objInv.flTax);
            }
        }

        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId])) {
            OBJ_PROCESSED[objUnbilledData.stAcctId] = {};
        }
        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId].arrInvId)) {
            OBJ_PROCESSED[objUnbilledData.stAcctId].arrInvId = [];
        }
        OBJ_PROCESSED[objUnbilledData.stAcctId].arrInvId.push(objInv.stInvId);

        nlapiLogExecution('DEBUG', stLogTitle, 'objInv = ' + JSON.stringify(objInv));
        nlapiLogExecution('AUDIT', stLogTitle, 'Intercompany Invoice created (' + objInv.stInvId + ') for account #' + objUnbilledData.stAcctText + ' and IC Project #' + objUnbilledData.stEntity);
    }
    catch (err) {
        nlapiLogExecution('ERROR', stLogTitle, 'ER-0003: Intercompany Inv not created for jounral #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        ARR_ERROR_DETAILS.push('ER-0003: Intercompany Inv not created for journal #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        if (!Eval.inArray(objUnbilledData.stAcctId, ARR_FAILED_ACCT)) {
            ARR_FAILED_ACCT.push(objUnbilledData.stAcctId);
        }
    }

    return objInv;
}



/**
 * Create an Intercompany Vendor Bill
 * @param objUnbilledData
 * @param flTax
 * @returns stVBId
 */
function createIntercompanyVB(objUnbilledData, flTax, invNum) {
    var stLogTitle = 'scheduled_unbilledBalances.createIntercompanyVB';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter createIntercompanyVB');

    //Submit Record
    var stVBId = '';
    try {
        //Create the intercompany vendor bill
        var recIntercoVB = nlapiCreateRecord('vendorbill',
            {
                recordmode: 'dynamic', customform: OBJ_PARAM.stDefaultVBForm
            });

        recIntercoVB.setFieldValue('entity', objUnbilledData.stVendor);
        recIntercoVB.setFieldValue('subsidiary', objUnbilledData.stToSubsidiary);
        //    recIntercoVB.setFieldValue('trandate', ST_TRAN_DATE); //Transaction Date
        recIntercoVB.setFieldValue('currency', objUnbilledData.stProjectCurrency);
        recIntercoVB.setFieldValue('custbody_is_interco_adj', 'T');
        recIntercoVB.setFieldValue('approvalstatus', OBJ_PARAM.stParamApprStatus);
        recIntercoVB.setFieldValue('tranid', invNum);
        //Item Line
        recIntercoVB.selectNewLineItem('item');
        recIntercoVB.setCurrentLineItemValue('item', 'item', objUnbilledData.stVBItem);
        recIntercoVB.setCurrentLineItemValue('item', 'description', objUnbilledData.stEntity);
        recIntercoVB.setCurrentLineItemValue('item', 'quantity', 1);
        recIntercoVB.setCurrentLineItemValue('item', 'rate', objUnbilledData.stAmt);
        recIntercoVB.commitLineItem('item');

        if (!Eval.isEmpty(flTax)) {
            recIntercoVB.selectNewLineItem('item');
            recIntercoVB.setCurrentLineItemValue('item', 'item', OBJ_PARAM.stParamTaxAcct);
            recIntercoVB.setCurrentLineItemValue('item', 'quantity', 1);
            recIntercoVB.setCurrentLineItemValue('item', 'rate', flTax);
            recIntercoVB.commitLineItem('item');
        }

        stVBId = nlapiSubmitRecord(recIntercoVB, false, true);
        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId])) {
            OBJ_PROCESSED[objUnbilledData.stAcctId] = {};
        }
        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId].arrVBId)) {
            OBJ_PROCESSED[objUnbilledData.stAcctId].arrVBId = [];
        }
        OBJ_PROCESSED[objUnbilledData.stAcctId].arrVBId.push(stVBId);

        nlapiLogExecution('AUDIT', stLogTitle, 'Intercompany VB created (' + stVBId + ') for transaction #' + objUnbilledData.stAcctText + ' and IC Project #' + objUnbilledData.stEntity);
    }
    catch (err) {
        nlapiLogExecution('ERROR', stLogTitle, 'ER-0004: Intercompany VB not created for journal #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        ARR_ERROR_DETAILS.push('ER-0004: Intercompany VB not created for journal #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        if (!Eval.inArray(objUnbilledData.stAcctId, ARR_FAILED_ACCT)) {
            ARR_FAILED_ACCT.push(objUnbilledData.stAcctId);
        }
    }

    return stVBId;
}

/**
 * Create a credit memo
 * @param objUnbilledData
 * @returns stCMId
 */
function createCreditMemo(objUnbilledData) {
    var stLogTitle = 'scheduled_unbilledBalances.createCreditMemo';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter createCreditMemo');

    var stCMId = '';
    try {
        var recIntercoCM = nlapiCreateRecord('creditmemo',
            {
                recordmode: 'dynamic'
            });
        recIntercoCM.setFieldValue('entity', objUnbilledData.stClient); //Customer
        recIntercoCM.setFieldValue('subsidiary', OBJ_PARAM.stParamFromSubsidiary); //From Subsidiary
        //    recIntercoCM.setFieldValue('trandate', ST_TRAN_DATE); //Transaction Date
        recIntercoCM.setFieldValue('currency', objUnbilledData.stProjectCurrency);
        recIntercoCM.setFieldValue('custbody_is_interco_adj', 'T');

        //Line Item
        recIntercoCM.selectNewLineItem('item');
        recIntercoCM.setCurrentLineItemValue('item', 'item', objUnbilledData.stItem);
        recIntercoCM.setCurrentLineItemValue('item', 'description', objUnbilledData.stEntity);
        recIntercoCM.setCurrentLineItemValue('item', 'quantity', 1);
        recIntercoCM.setCurrentLineItemValue('item', 'amount', Parse.forceFloat(objUnbilledData.stAmt) * -1);
        recIntercoCM.commitLineItem('item');

        stCMId = nlapiSubmitRecord(recIntercoCM, false, true);

        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId])) {
            OBJ_PROCESSED[objUnbilledData.stAcctId] = {};
            OBJ_PROCESSED[objUnbilledData.stAcctId].arrCM = [];
        }
        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId].arrCM)) {
            OBJ_PROCESSED[objUnbilledData.stAcctId].arrCM = [];
        }
        OBJ_PROCESSED[objUnbilledData.stAcctId].arrCM.push(stCMId);

        nlapiLogExecution('AUDIT', stLogTitle, 'Intercompany CM created (' + stCMId + ') for account #' + objUnbilledData.stAcctText + ' and IC Project #' + objUnbilledData.stEntity);
    }
    catch (err) {
        nlapiLogExecution('ERROR', stLogTitle, 'ER-0005: Intercompany CM not created for jounral #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        ARR_ERROR_DETAILS.push('ER-0005: Intercompany CM not created for journal #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        if (!Eval.inArray(objUnbilledData.stAcctId, ARR_FAILED_ACCT)) {
            ARR_FAILED_ACCT.push(objUnbilledData.stAcctId);
        }
    }

    return stCMId;
}

/**
 * Create a bill credit
 * @param objUnbilledData
 * @returns stBCId
 */
function createBillCredit(objUnbilledData, cmId) {
    var stLogTitle = 'scheduled_unbilledBalances.createBillCredit';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter createBillCredit');

    //Submit Record
    var stBCId = '';
    try {

        //Create the intercompany vendor bill
        var recIntercoBC = nlapiCreateRecord('vendorcredit',
            {
                recordmode: 'dynamic'
            });
        var cmTranId = nlapiLookupField('creditmemo', cmId, 'tranid');
        recIntercoBC.setFieldValue('tranid', cmTranId);
        recIntercoBC.setFieldValue('entity', objUnbilledData.stVendor);
        recIntercoBC.setFieldValue('subsidiary', objUnbilledData.stToSubsidiary);
        //    recIntercoBC.setFieldValue('trandate', ST_TRAN_DATE); //Transaction Date
        recIntercoBC.setFieldValue('currency', objUnbilledData.stProjectCurrency);
        recIntercoBC.setFieldValue('custbody_is_interco_adj', 'T');

        //Item Line
        recIntercoBC.selectNewLineItem('item');
        recIntercoBC.setCurrentLineItemValue('item', 'item', objUnbilledData.stVBItem);
        recIntercoBC.setCurrentLineItemValue('item', 'description', objUnbilledData.stEntity);
        recIntercoBC.setCurrentLineItemValue('item', 'quantity', 1);
        recIntercoBC.setCurrentLineItemValue('item', 'rate', Parse.forceFloat(objUnbilledData.stAmt) * -1);
        recIntercoBC.commitLineItem('item');

        stBCId = nlapiSubmitRecord(recIntercoBC, false, true);
        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId])) {
            OBJ_PROCESSED[objUnbilledData.stAcctId] = {};

        }
        if (Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId].arrBC)) {
            OBJ_PROCESSED[objUnbilledData.stAcctId].arrBC = [];
        }
        OBJ_PROCESSED[objUnbilledData.stAcctId].arrBC.push(stBCId);

        nlapiLogExecution('AUDIT', stLogTitle, 'Intercompany Bill Credit created (' + stBCId + ') for transaction #' + objUnbilledData.stAcctText + ' and IC Project #' + objUnbilledData.stEntity);
    }
    catch (err) {
        nlapiLogExecution('ERROR', stLogTitle, 'ER-0006: Intercompany  Bill Credit not created for journal #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        ARR_ERROR_DETAILS.push('ER-0006: Intercompany  Bill Credit not created for journal #' + objUnbilledData.stAcctText + ' for IC Project #' + objUnbilledData.stEntity + ' | ' + err.getCode() + ' : ' + err.getDetails());
        if (!Eval.inArray(objUnbilledData.stAcctId, ARR_FAILED_ACCT)) {
            ARR_FAILED_ACCT.push(objUnbilledData.stAcctId);
        }
    }

    return stBCId;
}


/*
 * Create Journal for FX gain or Loss
 * @param objUnbilledData
 *
function createJournal(objUnbilledData)
{
  var stLogTitle = 'scheduled_unbilledBalances.createJournal';
  nlapiLogExecution('DEBUG', stLogTitle, 'Enter createJournal');

  var stJEId = '';
  try
  {

    //Search for the GL Impact
    var arrGLImpResult = searchGLImpact(objUnbilledData.stAPAcct, objUnbilledData.stToSubsidiary, OBJ_PARAM.stParamJEgl,false);
    var arrGLImpResult2 = searchGLImpact(objUnbilledData.stAPAcct, objUnbilledData.stToSubsidiary,  OBJ_PARAM.stParamJEgl2, true);

    if(!Eval.isEmpty(arrGLImpResult) || !Eval.isEmpty(arrGLImpResult2) )
    {
      var flAmt = 0;
      if(!Eval.isEmpty(arrGLImpResult))
      {
        var objItem = arrGLImpResult[0];
         if (objUnbilledData.stToSubsidiary!= 31 && objUnbilledData.stToSubsidiary!= 37){
                      flAmt += Parse.forceFloat(objItem.getValue('formulacurrency', null, 'SUM'));
                  }
                  else{
                    flAmt += parseInt(objItem.getValue('formulacurrency', null, 'SUM'));
                  }
        //flAmt += Parse.forceFloat(objItem.getValue('formulacurrency', null, 'SUM'));
        nlapiLogExecution('DEBUG', stLogTitle, 'flAmt ='+flAmt);
      }

      if(!Eval.isEmpty(arrGLImpResult2))
      {
        var objItem = arrGLImpResult2[0];
       if (objUnbilledData.stToSubsidiary!= 31 && objUnbilledData.stToSubsidiary!= 37){
                      flAmt += Parse.forceFloat(objItem.getValue('formulacurrency', null, 'SUM'));
                  }
                  else{
                    flAmt += parseInt(objItem.getValue('formulacurrency', null, 'SUM'));
                  }
        nlapiLogExecution('DEBUG', stLogTitle, 'flAmt ='+flAmt);
      }

      nlapiLogExecution('DEBUG', stLogTitle, 'flAmt ='+flAmt);

      if(flAmt != 0)
      {
        var recJE = nlapiCreateRecord('journalentry',
        {
          recordmode : 'dynamic'
        });

        recJE.setFieldValue('subsidiary', objUnbilledData.stToSubsidiary);
        recJE.setFieldValue('custbody_apco_fx_processed', 'T');

        //JE Lines
        var objStaticValues = {};

        //If negative
//        if(flAmt < 0)
//        {
//          createJournalLine(recJE, null, 'debit', OBJ_PARAM.stParamRealizedFXGLAcct, flAmt, objStaticValues);
//          createJournalLine(recJE, null, 'credit', objUnbilledData.stAPAcct, flAmt, objStaticValues);
//        }
        //If positive
//        else
//        {
          createJournalLine(recJE, null, 'debit', objUnbilledData.stAPAcct, flAmt, objStaticValues);
          createJournalLine(recJE, null, 'credit', OBJ_PARAM.stParamRealizedFXGLAcct, flAmt, objStaticValues);
//        }

        stJEId = nlapiSubmitRecord(recJE, false, true);
        if(Eval.isEmpty(OBJ_PROCESSED[objUnbilledData.stAcctId]))
        {
          OBJ_PROCESSED[objUnbilledData.stAcctId] = {};
        }
        OBJ_PROCESSED[objUnbilledData.stAcctId].stJEId = stJEId;

        nlapiLogExecution('AUDIT', stLogTitle, 'JE was created successfully. ID = ' + stJEId);
      }
      else
      {
        nlapiLogExecution('AUDIT', stLogTitle, 'No JE was created. Amt = 0');
      }
    }
    else
    {
      nlapiLogExecution('AUDIT', stLogTitle, 'No JE was created. No result was found.');
    }
  }
  catch (err)
  {
    nlapiLogExecution('ERROR', stLogTitle, 'ER-0007: New JE not created for journal #' + objUnbilledData.stAcctText + ' | ' + err.getCode() + ' : ' + err.getDetails());
    ARR_ERROR_DETAILS.push('ER-0007:  New JE not created for journal #' + objUnbilledData.stAcctText + ' | ' + err.getCode() + ' : ' + err.getDetails());
    if(!Eval.inArray(objUnbilledData.stAcctId, ARR_FAILED_ACCT))
    {
      ARR_FAILED_ACCT.push(objUnbilledData.stAcctId);
    }
  }

}


/*
 * Create a JE or ICJE Line
 *
 * @param recTxn
 * @param stLineSub
 * @param stType
 * @param stAcct
 * @param stAmount
 * @param objStaticValues
 *
 *
function createJournalLine(recTxn, stLineSub, stType, stAcct, stAmount, objStaticValues)
{
  var stLogTitle = 'scheduled_unbilledBalances.createJournalLine';
  nlapiLogExecution('DEBUG', stLogTitle, 'stLineSub = ' + stLineSub + ' | stType = ' + stType + ' | stAcct = ' + stAcct + ' | stAmount = ' + stAmount);

  recTxn.selectNewLineItem('line');
  if (!Eval.isEmpty(stLineSub))
  {
    recTxn.setCurrentLineItemValue('line', 'linesubsidiary', stLineSub); // ICJE
  }

  recTxn.setCurrentLineItemValue('line', stType, stAmount.toFixed(2));
  recTxn.setCurrentLineItemValue('line', 'account', stAcct);

  if (objStaticValues != null)
  {
    for ( var stKeyObj in objStaticValues)
    {
      try
      {
        recTxn.setCurrentLineItemValue('line', stKeyObj, objStaticValues[stKeyObj]);
      }
      catch (error)
      {
        nlapiLogExecution('ERROR', stLogTitle, 'stKeyObj = ' + stKeyObj + ' | objStaticValues[stKeyObj] = ' + objStaticValues[stKeyObj]);
      }
    }
  }
  recTxn.commitLineItem('line');

}
*/


/**
*
* Send error status email
*
*/
function sendEmail() {
    var stLogTitle = 'scheduled_unbilledBalances.sendEmail';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter sendEmail');

    var stUser = nlapiGetUser();
    var stSubject = '[APCO] Intercompany Invoice and Bills] ';
    var stBody = '';
    stBody += 'Date: ' + new Date() + ' <br/>';
    if (!Eval.isEmpty(ARR_ERROR_DETAILS)) {
        stBody += 'Errors: <br/>';
        for (var intCtr = 0; intCtr < ARR_ERROR_DETAILS.length; intCtr++) {
            stBody += ' - ' + ARR_ERROR_DETAILS[intCtr] + '<br/>';
        }
    }
    else {
        stBody += 'Process Status: Successful.';
    }

    nlapiSendEmail(stUser, stUser, stSubject, stBody);

    nlapiLogExecution('DEBUG', stLogTitle, 'Email Sent.. stUser = ' + stUser);
}

/**
 * Get Account Objects
 * @param arrAccts
 * @returns obj
 *
 */
function getAccountObjects(arrAccts) {
    var stLogTitle = 'suitelet_unbilledBalances.getAccountObjects';

    var objAccts = {};
    var arrClientVendorChart = searchClientVendorChart(arrAccts);

    if (Eval.isEmpty(arrClientVendorChart)) {
        nlapiLogExecution('ERROR', 'No Mapping found..');
        throw nlapiCreateError('ERROR', 'No Mapping found..');
    }

    for (var intAcctCtr = 0; intAcctCtr < arrClientVendorChart.length; intAcctCtr++) {
        var objCB = arrClientVendorChart[intAcctCtr];
        var stAcct = objCB.getValue('custrecord_ic_ar_acct');

        if (Eval.isEmpty(objAccts[stAcct])) {
            objAccts[stAcct] = {};
            objAccts[stAcct]._internal = objCB.getValue('internalid');
            objAccts[stAcct]._from_sub = objCB.getValue('custrecord_from_sub');
            objAccts[stAcct]._to_sub = objCB.getValue('custrecord_to_sub');
            objAccts[stAcct]._ic_client = objCB.getValue('custrecord_ic_client');
            objAccts[stAcct]._ic_vendor = objCB.getValue('custrecord_ic_vendor');
            objAccts[stAcct]._ic_item = objCB.getValue('custrecord_ic_item');
            objAccts[stAcct]._ic_vb_item = objCB.getValue('custrecord_vb_item');
            objAccts[stAcct]._ap_account = objCB.getValue('custrecord_accr_ic_ap');
        }
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'objAccts = ' + JSON.stringify(objAccts));

    return objAccts;

}


//------------------------------------------------- SEARCHES  -------------------------------------------------

/**
 * Search Acctg Period
 * @param stNextDay
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchAcctPeriod(stNextDay) {
    var stLogTitle = 'suitelet_unbilledBalances.searchAcctPeriod';
    //Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('startdate', null, 'on', stNextDay));
    arrFilters.push(new nlobjSearchFilter('isquarter', null, 'is', 'F'));

    //Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('internalid'));

    var arrResults = nlapiSearchRecord('accountingperiod', null, arrFilters, arrColumns);

    if (Eval.isEmpty(arrResults)) {
        arrResults = [];
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}


/**
 * Search for the Intercompany Client Vendor
 * @param arrAccts
 * @returns arrResults - search result of the saved search executed against transaction
 *
 */
function searchClientVendorChart(arrAccts) {
    var stLogTitle = 'suitelet_unbilledBalances.searchClientVendorChart';

    //Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('custrecord_from_sub', null, 'anyof', OBJ_PARAM.stParamFromSubsidiary));
    arrFilters.push(new nlobjSearchFilter('custrecord_ic_ar_acct', null, 'anyof', arrAccts));

    //Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('internalid'));
    arrColumns.push(new nlobjSearchColumn('custrecord_from_sub'));
    arrColumns.push(new nlobjSearchColumn('custrecord_to_sub'));
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_client'));
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_vendor'));
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_item'));
    arrColumns.push(new nlobjSearchColumn('custrecord_vb_item'));
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ar_acct'));
    arrColumns.push(new nlobjSearchColumn('custrecord_accr_ic_ap'));

    var arrResults = nlapiSearchRecord('customrecord_apco_ic_client_vdnr', null, arrFilters, arrColumns);

    if (Eval.isEmpty(arrResults)) {
        arrResults = [];
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}


/**
 * Search Detailed AR
 * @param arrAcctsToProcess
 * @param stSearch
 * @returns arrResults - search result of the saved search executed against transaction
 *
 */

function searchUnbilledList(arrAcctsToProcess, stSearch, stEntityId) {
    var stLogTitle = 'suitelet_unbilledBalances.showUnbilledBalancesListPage.searchUnbilledList :: ' + stSearch;
    nlapiLogExecution('DEBUG', stLogTitle, 'arrAcctsToProcess = ' + arrAcctsToProcess + ' | stSearch = ' + stSearch + ' | stEntityId = ' + stEntityId + ' | ST_TRAN_DATE = ' + ST_TRAN_DATE);

    //Filters and Columns
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', OBJ_PARAM.stParamFromSubsidiary));
    arrFilters.push(new nlobjSearchFilter('account', null, 'anyof', arrAcctsToProcess));
    arrFilters.push(new nlobjSearchFilter('startdate', 'accountingperiod', 'onorbefore', ST_TRAN_DATE));
    if (!Eval.isEmpty(stEntityId)) {
        arrFilters.push(new nlobjSearchFilter('custcol_apco_ic_project', null, 'anyof', stEntityId));
    }

    var arrColumns = [];

    var arrResults = SuiteUtil.search(stSearch, 'transaction', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}

/**
 * Search Detailed AR
 * @param arrAcctsToProcess
 * @param stSearch
 * @returns arrResults - search result of the saved search executed against transaction
 *
 */

function searchUnbilledDetailList(arrAcctsToProcess, stSearch, stEntityId) {
    var stLogTitle = 'suitelet_unbilledBalances.showUnbilledBalancesListPage.searchUnbilledDetailList :: ' + stSearch;
    nlapiLogExecution('DEBUG', stLogTitle, 'arrAcctsToProcess = ' + arrAcctsToProcess + ' | stSearch = ' + stSearch + ' | stEntityId = ' + stEntityId + ' | ST_TRAN_DATE = ' + ST_TRAN_DATE);

    //Filters and Columns
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', OBJ_PARAM.stParamFromSubsidiary));
    arrFilters.push(new nlobjSearchFilter('account', null, 'anyof', arrAcctsToProcess));
    if (ST_BY_DATE == 'T') {
        arrFilters.push(new nlobjSearchFilter('trandate', null, 'within',
            [
                ST_FROM_DATE, ST_TO_DATE
            ]));
    } else {
        //  arrFilters.push(new nlobjSearchFilter('internalid', 'accountingperiod', 'anyof', OBJ_PARAM.stParamPeriod));
    }
    if (!Eval.isEmpty(stEntityId)) {
        arrFilters.push(new nlobjSearchFilter('custcol_apco_ic_project', null, 'anyof', stEntityId));
    }

    var arrColumns = [];

    var arrResults = SuiteUtil.search(stSearch, 'transaction', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}


/**
 * Search for GL Impact
 * @param stAcctId
 * @param stToSubsidiary
 * @returns arrResults - search result of the saved search executed against transaction
 *
 */
function searchGLImpact(stAcctId, stToSubsidiary, stSearch, bByPd) {
    var stLogTitle = 'suitelet_unbilledBalances.searchGLImpact';
    nlapiLogExecution('DEBUG', stLogTitle, 'stAcctId = ' + stAcctId);

    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', stToSubsidiary));
    arrFilters.push(new nlobjSearchFilter('account', null, 'anyof', stAcctId));

    if (bByPd) {
        //  arrFilters.push(new nlobjSearchFilter('internalid', 'accountingperiod', 'anyof', ST_NEXT_PD));
    }
    else {
        if (ST_BY_DATE == 'T') {
            //   arrFilters.push(new nlobjSearchFilter('trandate', null, 'within',
            // [
            //   ST_FROM_DATE , ST_TO_DATE
            //  ]));
        } else {
            //   arrFilters.push(new nlobjSearchFilter('internalid', 'accountingperiod', 'anyof', OBJ_PARAM.stParamPeriod));
        }
    }

    var arrColumns = [];

    var arrResults = nlapiSearchRecord('transaction', stSearch, arrFilters, arrColumns);
    if (Eval.isEmpty(arrResults)) {
        return [];
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
}

// ------------------------------------------------- UTILITY FUNCTIONS -------------------------------------------------

var Eval =
    {
        /**
         * Evaluate if the given string is empty string, null or undefined.
         *
         * @param {String}
         *            stValue - Any string value
         * @returns {Boolean}
         * @memberOf Eval
         * @author memeremilla
         */
        isEmpty: function (stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            else {
                if (stValue instanceof String) {
                    if ((stValue == '')) {
                        return true;
                    }
                }
                else if (stValue instanceof Array) {
                    if (stValue.length == 0) {
                        return true;
                    }
                }

                return false;
            }
        },
        /**
         * Evaluate if the given string is an element of the array
         *
         * @param {String}
         *            stValue - String to find in the array.
         * @param {Array}
         *            arr - Array to be check for components.
         * @returns {Boolean}
         * @memberOf Eval
         * @author memeremilla
         */
        inArray: function (stValue, arr) {
            var bIsValueFound = false;

            for (var i = 0; i < arr.length; i++) {
                if (stValue == arr[i]) {
                    bIsValueFound = true;
                    break;
                }
            }

            return bIsValueFound;
        },
    };

var Parse =
    {
        /**
         * Converts String to Float
         *
         * @author asinsin
         */
        forceFloat: function (stValue) {
            var flValue = parseFloat(stValue);

            if (isNaN(flValue)) {
                return 0.00;
            }

            return flValue;
        },
    };

var SuiteUtil =
    {

        /**
         * Get all of the results from the search even if the results are more than
         * 1000.
         *
         * @param {String}
         *            strSearchId - the search id of the saved search that will be
         *            used.
         * @param {String}
         *            strRecordType - the record type where the search will be
         *            executed.
         * @param {Array}
         *            arrSearchFilter - array of nlobjSearchFilter objects. The
         *            search filters to be used or will be added to the saved search
         *            if search id was passed.
         * @param {Array}
         *            arrSearchColumn - array of nlobjSearchColumn objects. The
         *            columns to be returned or will be added to the saved search if
         *            search id was passed.
         * @returns {Array} - an array of nlobjSearchResult objects
         * @memberOf SuiteUtil
         * @author memeremilla
         */
        search: function (stSearchId, stRecordType, arrSearchFilter, arrSearchColumn) {
            var arrReturnSearchResults = new Array();
            var nlobjSavedSearch;

            if (stSearchId != null) {
                nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

                // add search filter if one is passed
                if (arrSearchFilter != null) {
                    nlobjSavedSearch.addFilters(arrSearchFilter);
                }

                // add search column if one is passed
                if (arrSearchColumn != null) {
                    nlobjSavedSearch.addColumns(arrSearchColumn);
                }
            }
            else {
                nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
            }

            var nlobjResultset = nlobjSavedSearch.runSearch();
            var intSearchIndex = 0;
            var nlobjResultSlice = null;
            do {
                if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
                    this.rescheduleScript(1000);
                }

                nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
                if (!(nlobjResultSlice)) {
                    break;
                }

                for (var intRs in nlobjResultSlice) {
                    arrReturnSearchResults.push(nlobjResultSlice[intRs]);
                    intSearchIndex++;
                }
            }

            while (nlobjResultSlice.length >= 1000);

            return arrReturnSearchResults;
        },

        /**
         * Pauses the scheduled script either if the remaining usage is less than
         * the specified governance threshold usage amount or the allowed time is
         * exceeded. Then it will reschedule it.
         *
         * @param {Number}
         *            intGovernanceThreshold - The value of the governance threshold
         *            usage units before the script will be rescheduled.
         * @param {Number}
         *            intStartTime - The time when the scheduled script started
         * @param {Number}
         *            flPercentOfAllowedTime - the percent of allowed time based
         *            from the maximum running time. The maximum running time is
         *            3600000 ms.
         * @returns void
         * @memberOf SuiteUtil
         * @author memeremilla
         */
        rescheduleScript: function (intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime) {
            var stLoggerTitle = 'SuiteUtil.rescheduleScript';
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                {
                    'Remaining usage': nlapiGetContext().getRemainingUsage()
                }));

            if (intMaxTime == null) {
                intMaxTime = 3600000;
            }

            var intRemainingUsage = nlapiGetContext().getRemainingUsage();
            var intRequiredTime = 900000; // 25% of max time
            if ((flPercentOfAllowedTime)) {
                var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
                intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
            }

            // check if there is still enough usage units
            if ((intGovernanceThreshold)) {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

                if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                        {
                            'Remaining usage': nlapiGetContext().getRemainingUsage()
                        }));
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

                    var objYield = nlapiYieldScript();
                    if (objYield.status == 'FAILURE') {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                            {
                                'Status': objYield.status,
                                'Information': objYield.information,
                                'Reason': objYield.reason
                            }));
                    }
                    else {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                            {
                                'After resume with': intRemainingUsage,
                                'Remaining vs governance threshold': intGovernanceThreshold
                            }));
                    }
                }
            }

            if ((intStartTime)) {
                // get current time
                var intCurrentTime = new Date().getTime();

                // check if elapsed time is near the arbitrary value
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

                var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

                if (intElapsedTime < intRequiredTime) {
                    nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

                    // check if we are not reaching the max processing time which is 3600000 seconds
                    var objYield = nlapiYieldScript();
                    if (objYield.status == 'FAILURE') {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                            {
                                'Status': objYield.status,
                                'Information': objYield.information,
                                'Reason': objYield.reason
                            }));
                    }
                    else {
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
                            {
                                'After resume with': intRemainingUsage,
                                'Remaining vs governance threshold': intGovernanceThreshold
                            }));

                        // return new start time
                        intStartTime = new Date().getTime();
                    }
                }
            }

            return intStartTime;
        },
    };
