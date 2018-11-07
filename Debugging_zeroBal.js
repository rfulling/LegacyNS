
var payorFormulaText = '{custbody_claim_ticket} || {currency} || {account.number}';
var ssQuadaxGrouped = 729;
var ssQuadaxSingle = 731;
var jobs = '402194USD1212';

//get the results of search all for a specific guy
var arrResults = nlapiSearchRecord('transaction', 'customsearch_ar_script_all_2', null, null);

if (arrResults) {
    for (var i = 0; icnt = arrResults.length, i < icnt; i++) {
        //get details for payorFormulaText
        var combination = arrResults[i].getValue('formulatext', null, 'GROUP');
        changePayorDetails(combination, payorFormulaText)

    }
}


function changePayorDetails(combination, payorFormulaText) {
    var _filters = [];
    _filters.push(new nlobjSearchFilter('formulatext', null, 'is', combination).setFormula(payorFormulaText));
    var _col = [];
    _col.push(new nlobjSearchColumn('internalid', null, null));
    _col.push(new nlobjSearchColumn('recordtype', null, null));

    var arrDet = nlapiSearchRecord('transaction', 'customsearch_custsearchtrandetail', _filters, _col);
    if (arrDet) {
        for (var x = 0; icnt = arrDet.length, x < icnt; x++) {
            var tranType = arrDet[x].getValue('recordtype');
            var recIntid = arrDet[x].getId();
            switch (tranType) {
                case 'journalentry': processJE(tranType,recIntid); break;
                case 'customerpayment': processPayment(tranType, recIntid); break;
                case 'creditmemo': processCM(tranType, recIntid); break;
                case 'invoice': processPayment(tranType, recIntid); break;
                
            }
        }
    }
        var stop = '';
}

function processPayment(trantype,parRec){
    nlapiSubmitField(trantype, parRec, ['customer', 'custbody_payor'], [11566, 11566]);
}

function processCM(trantype, parRec) {
    nlapiSubmitField(trantype, parRec, ['entity', 'custbody_payor'], [11566, 11566]);
}

function processJE(tranType, jeID) {

    var myJe = nlapiLoadRecord(tranType, jeID);
    myJe.setFieldValue('custbody_payor', 11566);
    var myLines = myJe.getLineItemCount('line')
    //set all the line values
    for (var i = 1; i <= myLines; i++) {
        myJe.setLineItemValue('line', 'entity', i, 11566);
    }
    nlapiSubmitRecord(myJe);
}

function processInvoice(invID){

}

processJobs(jobs, payorFormulaText, ssQuadaxGrouped, ssQuadaxSingle);

function processJobs(combination, payorFormulaText, ssQuadaxGrouped, ssQuadaxSingle) {


    arrJE = [];
    arrPayment = [];

    // Loop through quadax combinations

    var payorCount = 1;

    // Run saved search: "GHI AR Script Single ID [All Quadax - Grouped] - DO NOT DELETE"
    var arrQuadaxGrouped = searchTransactions(combination, payorFormulaText, ssQuadaxGrouped);


    // Multiple payor: Create journal entry
    if (payorCount > 1) {

        var jeid = createJournalEntry(arrQuadaxGrouped);
        if (jeid) arrJE.push(jeid);

    }

    // Create Payment
    createPayment(arrQuadaxGrouped, combination, payorFormulaText, ssQuadaxGrouped, ssQuadaxSingle);



}


function searchTransactions(combination, payorFormulaText, savedSearchId) {
    // set OBJ_SCRIPT_PARAMS._stSSARGroupByPayorFormulaTextFilter (Quadax+FX+AR) value and stCombination values as formula and values for filter
    var filters = [new nlobjSearchFilter('formulatext', null, 'is', combination).setFormula(payorFormulaText)];

    // run saved search: GHI AR Script Single ID [All Quadax - Grouped] - DO NOT DELETE
    return nlapiSearchRecord('transaction', savedSearchId, filters);
};

function createPayment(arrQuadaxGrouped, combination, payorFormulaText, ssQuadaxGrouped, ssQuadaxSingle) {


    // Run saved search: GHI AR Script Single ID [All Quadax] - DO NOT DELETE

    var arrQuadaxSingle = searchTransactions(combination, payorFormulaText, ssQuadaxSingle);

    // Loop through quadax grouped results
    for (var i = 0; icnt = arrQuadaxGrouped.length, i < icnt; i++) {
        var objResult = arrQuadaxGrouped[i];
        var objData = {};

        objData.entity = objResult.getValue('formulanumeric', null, 'GROUP');
        objData.entity = objData.entity.replace(/,/g, 'newchar');

        objData.account = objResult.getValue('account', null, 'GROUP');
        objData.oli = objResult.getValue('custbody_order_line_item', null, 'GROUP');
        objData.quadax = objResult.getValue('custbody_claim_ticket', null, 'GROUP');
        objData.department = objResult.getValue('department', null, 'GROUP');
        objData.clazz = objResult.getValue('class', null, 'GROUP');
        objData.location = objResult.getValue('location', null, 'GROUP');
        objData.currency = objResult.getValue('currency', null, 'GROUP');

        // No Payor - main requirement for creating a Customer Payment record


        // Initiate create of Customer Payment
        var objRecCustPayment = nlapiCreateRecord('customerpayment', { recordmode: 'dynamic', entity: objData.entity });

        // Set A/R Account, Order Line Item, Quadax Ticket ID, Department, Class (Product Line), Location
        objRecCustPayment.setFieldValue('aracct', objData.account);
        objRecCustPayment.setFieldValue('custbody_order_line_item', objData.oli);
        objRecCustPayment.setFieldValue('custbody_claim_ticket', objData.quadax);
        objRecCustPayment.setFieldValue('department', objData.department);
        objRecCustPayment.setFieldValue('class', objData.clazz);
        objRecCustPayment.setFieldValue('location', objData.location);
        objRecCustPayment.setFieldValue('autoapply', 'F');
        objRecCustPayment.setFieldValue('currency', objData.currency);
        objRecCustPayment.setFieldValue('memo', 'rtf debug');// v1.10 | aph added for memo population

        var hasAppliedLines = false;
        var lineTypes = ['apply', 'credit'];

        // Loop through apply and credit lines
        for (var j = 0; j < lineTypes.length; j++) {
            var sublist = lineTypes[j];
            var totalLines = objRecCustPayment.getLineItemCount(sublist);
            var totalMatched = 0;


            // Loop through apply or credit lines
            for (var l = 1; l <= totalLines; l++) {
                // Get Ref. No. and Type of record of the line
                var objLine = {};
                objLine.refno = objRecCustPayment.getLineItemValue(sublist, 'refnum', l);
                objLine.cptype = objRecCustPayment.getLineItemValue(sublist, 'trantype', l);
                objLine.amount = parseFloat(objRecCustPayment.getLineItemValue(sublist, 'due', l));


                objLine.amount *= (sublist == 'credit') ? -1 : 1;

                // Check if line fields match any of the results
                if (hasMatch(objLine, arrQuadaxSingle)) {
                    hasAppliedLines = true;
                    totalMatched++;

                    // Apply line
                    objRecCustPayment.selectLineItem(sublist, l);
                    objRecCustPayment.setCurrentLineItemValue(sublist, 'apply', 'T');
                    objRecCustPayment.commitLineItem(sublist);

                    //   nlapiLogExecution('DEBUG', stLogTitle, 'Apply: ' + ['sublist=' + sublist,
                    //	                                                    'refno=' + objLine.refno,
                    //	                                                    'cptype=' + objLine.cptype,
                    //	                                                    'amount=' + objLine.amount].join(' | '));
                }


            }

        }

        // Set payment to 0
        objRecCustPayment.setFieldValue('payment', 0);

        if (hasAppliedLines) {
            try {
                var paymentId = nlapiSubmitRecord(objRecCustPayment, true);
                nlapiLogExecution('audit', stLogTitle, 'Customer payment created: Payor=' + objData.entity + ' | Id=' + paymentId);
                arrPayment.push(paymentId);
            }
            catch (error) {
                var msg = (error.getDetails != undefined) ? (error.getCode() + ': ' + error.getDetails()) : error.toString();
                nlapiLogExecution('error', stLogTitle, '[Error] Payment not created: error=' + msg);
            }
        }

        objRecCustPayment = null;
        objResult = null;
        objData = null;



    }

}

function hasMatch(objLine, arrQuadaxSingle) {
    // Loop through quadax single result
    for (var i = 0; icnt = arrQuadaxSingle.length, i < icnt; i++) {
        var result = arrQuadaxSingle[i];
        var tranid = result.getValue('tranid');
        var fxAmount = parseFloat(result.getValue('formulacurrency'));
        var type = result.getValue('type');

        // if matching, break loop
        if (tranid == objLine.refno && fxAmount == objLine.amount && objLine.cptype == type) {
            return true;
        }


    }

    return false;
}

function createJournalEntry(arrResults) {
    var stLogTitle = 'processJECreation';

    // Initiate create of JE
    var objRecJE = nlapiCreateRecord('journalentry');

    for (var i = 0; cnt = arrResults.length, i < cnt; i++) {



        var objResult = arrResults[i];
        var objData = {};

        if (i == 0) {
            objData.quadax = objResult.getValue('custbody_claim_ticket', null, 'GROUP');
            objData.subsidiary = objResult.getValue('subsidiary', null, 'GROUP');
            objData.oli = objResult.getValue('custbody_order_line_item', null, 'GROUP');
            objData.currency = objResult.getValue('currency', null, 'GROUP');

            // Set header fields
            objRecJE.setFieldValue('custbody_claim_ticket', objData.quadax);
            objRecJE.setFieldValue('subsidiary', objData.subsidiary);
            objRecJE.setFieldValue('custbody_order_line_item', objData.oli);
            objRecJE.setFieldValue('currency', objData.currency);
            objRecJE.setFieldValue('approved', 'T');
            objRecJE.setFieldValue('memo', stMemo);// v1.10 | aph added for memo population
        }

        // Set header fields
        objData.fxAmount = NSUtil.forceFloat(objResult.getValue('formulacurrency', null, 'SUM'));
        objData.account = objResult.getValue('account', null, 'GROUP');
        objData.location = objResult.getValue('location', null, 'GROUP');
        objData.department = objResult.getValue('department', null, 'GROUP');
        objData.clazz = objResult.getValue('class', null, 'GROUP');
        objData.entityId = objResult.getValue('formulanumeric', null, 'GROUP');
        objData.entityId = objData.entityId.replace(/,/g, 'newchar');

        // Add new line item
        objRecJE.selectNewLineItem('line');

        // Add a credit line if amount is positive
        if (objData.fxAmount >= 0) {
            objData.type = 'credit';
            objRecJE.setCurrentLineItemValue('line', 'credit', objData.fxAmount);
        }

            // Add a debit line if amount is negative
        else if (objData.fxAmount < 0) {
            objData.type = 'debit';
            objRecJE.setCurrentLineItemValue('line', 'debit', (objData.fxAmount * -1));
        }

        // Set line fields
        objRecJE.setCurrentLineItemValue('line', 'entity', objData.entityId);							// Name
        objRecJE.setCurrentLineItemValue('line', 'custcol_transaction_line_payor', objData.entityId);	// Payor
        objRecJE.setCurrentLineItemValue('line', 'account', objData.account);							// Account
        objRecJE.setCurrentLineItemValue('line', 'location', objData.location);							// Location
        objRecJE.setCurrentLineItemValue('line', 'department', objData.department);						// Department
        objRecJE.setCurrentLineItemValue('line', 'class', objData.clazz);								// Class (product line)
        objRecJE.setCurrentLineItemValue('line', 'memo', stMemo);										// v1.10 | aph added for memo population

        // commit new line item
        objRecJE.commitLineItem('line');

        objResult = null;
        objData = null;

    }

    try {
        // Submit journal entry
        var newJEId = nlapiSubmitRecord(objRecJE, false, true);
        return newJEId;
    }
    catch (error) {
        var msg = (error.getDetails != undefined) ? (error.getCode() + ': ' + error.getDetails()) : error.toString();
    }

}
