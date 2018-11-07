/**
 * Copyright NetSuite, Inc. 2014 All rights reserved. The following code is a
 * demo prototype. Due to time constraints of a demo, the code may contain bugs,
 * may not accurately reflect user requirements and may not be the best
 * approach. Actual implementation should not reuse this code without due
 * verification.
 *
 * (Module description here. Whole header length should not exceed 100
 * characters in width. Use another line if needed.)
 *
 * Version Date Author Remarks 1.00 11 Jun 2014 rtapulado 1.1 27 March 2015
 * rfulling
 *
 */
{
    // Script params
    var context = nlapiGetContext();
    var ACT_ACCRUED_REVENUE = context.getSetting('SCRIPT', 'custscript_ghi_accrued_revenue');
    var ITEM_GL_DISOUNTAACCOUNT = context.getSetting('SCRIPT', 'custscript_gen_contract_discount_act');
    var ITEM_GL_CONTRACTUALACCOUNT = context.getSetting('SCRIPT', 'custscript_gen_disc_account');
    var ACT_ALLOWANCE_DA = context.getSetting('SCRIPT', 'custscript_ghi_allowance_disc');

    // var ACT_ALLOWANCE_ACCRUED_REV = context.getSetting('SCRIPT',
    //custscript_ghi_allowance_accrued_disc');

    var ACT_ACCRUED_REV_QUADAX = context.getSetting('SCRIPT', 'custscript_ghi_prod_rev_quadax');
    var ACT_DISCOUNTS_ALLOWANCES = context.getSetting('SCRIPT', 'custscript_ghi_discounts_allowances');
    var ACT_ACCOUNTS_RECEIVABLE = context.getSetting('SCRIPT', 'custscript_ghi_ar_account');
    var ACT_REV_INTERNATIONAL = context.getSetting('SCRIPT', 'custscript_ghi_sales_rev_int');
    var ACT_CLEARING = context.getSetting('SCRIPT', 'custscript_ghi_clearing_account_1999');
    var ACT_1201_AR_NOT_IDENTIFIED = context.getSetting('SCRIPT', 'custscript_ghi_1201_ar_unidentified');
    var ACT_ACCRUED_REFUND = context.getSetting('SCRIPT', 'custscript_ghi_accrued_refund');
    var ACT_PAYABLE = context.getSetting('SCRIPT', 'custscript_ghi_2000_ap');
    var ACT_ACCRUED_DISCOUNT = context.getSetting('SCRIPT', 'custscript_ghi_allowance_accrued_disc');
    var ACT_ACCOUNTS_REC = context.getSetting('SCRIPT', 'custscript_ghi_ar_account');
    var ACT_TPAYMENTS = context.getSetting('SCRIPT', 'custscript_ghi_1061_cash_payments');
    var ACT_ALLOWANCE_BAD_DEBT = context.getSetting('SCRIPT', 'custscript_ghi_allowanc_bad_debt');
    var ACT_CLEARING = context.getSetting('SCRIPT', 'custscript_ghi_clearing_account_1999');
    var ACT_RELATED_SO = context.getSetting('SCRIPT', 'custrecord_related_sales_order');

    /**
	 ******************************************SCRIPT
	 * PARAMS****************
	 */

    // BILLING TRANSACTION FIELDS
    var REC_BT = 'customrecord_billing_transaction';
    var REC_SO = 'salesorder';
    var FLD_BILLINGEVENTTYPE = 'custrecord_bt_billable_event_type';
    var FLD_PAYER = 'custrecord_bt_payor';
    var FLD_TIER4_PLAN = 'custrecord_bt_tier_4_plan';
    var FLD_PRODUCT = 'custrecord_bt_product';
    var FLD_CURRENCY = 'custrecord_bt_transaction_currency';
    var FLD_EFFECTIVEDATE = 'custrecord_bt_effective_date';

    // var FLD_PAYERSCOVERAGE = 'custrecord_bt_payers_coverage';

    var FLD_PRODUCT_LISTPRICE = 'custrecord_bt_product_list_price';
    var FLD_CONTRACTUALAMOUNT = 'custrecord_bt_contractual_amount';
    var FLD_DISCOUNT = 'custrecord_bt_discount';
    var FLD_ACCRUALPARTIALLYRESERVED = 'custrecord_bt_accrual_partially_reserved';
    var FLD_ACCRUALFULLYRESERVED = 'custrecord_bt_accrual_fully_reserved';


    //  var FLD_CLAIM = 'custrecord_bt_claim';

    var FLD_REQID = 'custrecord_bt_requisition_id';
    var FLD_PAYMENTAMOUNT = 'custrecord_bt_transaction_amount';

    var FLD_QUADAX_TICKET_ID = 'custrecord_bt_quadax_ticket_id';
    var FLD_ADJUSTMENT_CAT = 'custrecord_bt_adjustment_category'
    var FLD_ORIG_SO = 'custrecord_related_sales_order';
    var FLD_BT_IN_CRITERIA = 'custrecord_bt_in_criteria';
    var FLD_BT_SERVICE_DATE = 'custrecord_bt_service_date';
    var FLD_BT_RELATED_RRM = 'custrecord_ghi_rrm_internal_id';

    /**
	 * ******************END OF BILLING TRANSACTION
	 * FIELDS*************************************************
	 */

    // Sales Order Fields ibc
    var FLD_MALE = 'custbody_ibc_male';
    var FLD_SO_GENDER = 'custbody_gender';
    var FLD_SO_IBC_NODE_NEGATIVE = 'custbody_ibc_negative';
    var FLD_SO_IBC_NODE_POS_1_3 = 'custbody_ibc_positive_1_3_nodes';
    var FLD_SO_IBC_NODE_POS_4 = 'custbody_ibc_positive_4plus_nodes';
    var FLD_SO_IBC_MICORMETS = 'custbody_ibc_micromets';
    var FLD_SO_IBC_UNCERTAIN = ' custbody_ibc_uncertain_unknown';
    var FLD_SO_IBC_UNSPECIFIED = 'custbody_ibc_unspecified';
    var FLD_SO_IBC_HER2_POS = 'custbody_ibc_ghi_her2_positive';
    var FLD_SO_IBC_ER_NEG = 'custbody_ibc_er_negative';
    var FLD_SO_IBC_NON_MED_ONC_ODERS = 'custbody_ibc_non_medonc_order';
    var FLD_SO_IBC_MULTI_TUMOR = 'custbody_ibc_multi_tumor';
    var FLD_SO_ICDS = 'custbody_dcis_dcis';

    // DCIS
    var FLD_SO_DCIS = 'custbody_dcis';

    // colon
    var FLD_SO_COLON_STAGE_2 = 'custbody_colon_stage2';
    var FLD_SO_COLON_STAGE3AB = 'custbody_colon_stage3ab';
    var FLD_SO_COLON_STAGE3C = 'custbody_colon_stage3c';

    // Prostate
    var FLD_SO_PROSTATE_AOBLESS6MTHS = 'custbody_prostate_aob_lessthan6mos';
    var FLD_SO_PROSTATE_AOB_6_36 = 'custbody_prostate_aob_6to36mos';
    var FLD_SO_GLEASON3PLUS4 = 'custbody_prostate_gleason3plus4';
    var FLD_SO_GLEASON4PLUS3 = 'custbody_prostate_gleason4plus3';
    var FLD_SO_GLEASON4PLUS3_GREATER = 'custbody_prostate_gleason4plus3_greate';
    var FLD_SO_PROSTATE_OOC = 'custbody_prostate_out_of_criteria';

    var FLD_OLI = 'custrecord_bt_oli_number';
    var FLD_SO_OLI = 'custbody_order_line_item';

    /**
	 * ******************END OF SALES ORDER
	 * fIELDS*************************************************
	 */

    // RRM Fields
    var REC_RRM = 'customrecord_rev_rec_matrix';
    var FLD_RRM_CHILDACC = 'custrecord_rrm_child_accounts'; // for payer
    var FLD_RRM_TIER4_PAYOR = 'custrecord_tier_4_plan_level';
    var FLD_RRM_PRODUCT = 'custrecord_rrm_product';
    var FLD_RRM_CURRENCY = 'custrecord_rrm_currency';
    var FLD_RRM_EFFECTIVEDATE = 'custrecord_rrm_rev_status_effective_date';
    var FLD_RRM_REVENUE_END_DATE = 'custrecord_rrm_rrm_entry_termination_dat';
    var FLD_RRM_EFFECTIVE_DATE = 'custrecord_rrm_rev_status_effective_date';
    var FLD_RRM_REVENUE_STATUS = 'custrecord_rrm_revenue_status';

    // IBC
    var FLD_RRM_MALE = 'custrecord_rrm_male';
    var FLD_RRM_NODENEGATIVE = 'custrecord_rrm_ibc_node_neg';
    var FLD_RRM_NODEPOSITIVE_1_3 = 'custrecord_rrm_ibc_node_pos_1_3_nodes';
    var FLD_RRM_NODEPOSITIVE_4 = 'custrecord_rrm_ibc_node_po_4_plus';
    var FLD_RRM_MICROMETS = 'custrecord_rrm_ibc_micromets';
    var FLD_RRM_NODEUNCERTAIN = 'custrecord_rrm_ibc_node_uncertainunknown';
    var FLD_RRM_NODEUNSPECIFIED = 'custrecord_rrm_ibc_node_unspecified';
    var FLD_RRM_HER2POSITIVE = 'custrecord_rrm__ibc_her2_positive';
    var FLD_RRM_ERNEGATIVE = 'custrecord_rrm_ibc_er_negative';
    var FLD_RRM_NOMEDONCORDERS = 'custrecord_rrm_ibc_nonmed_onc_orders';
    var FLD_RRM_MULITTUMOR = 'custrecord_rrm_ibc_nonmed_onc_orders';

    // Colon
    var FLD_RRM_COLON_STAGE2 = 'custrecord_rrm_col_stage_2';
    var FLD_RRM_COLON_STAGE3 = 'custrecord_rrm_col_stage_3ab';
    var FLD_RRM_COLON_STAGE3C = 'custrecord_colon_stage_3c';

    // DCIS
    var FLD_RRM_DCIS = 'custrecord_rrm_dcis';

    // Prostate
    var FLD_RRM_BIOPSYLESSTHAN_6 = 'custrecord_rrm_prostate_aob_lt_6_m';
    var FLD_RRM_BIOPSY636 = 'custrecord_rrm_prostate_aob_6to36mos';
    var FLD_RRM_GLEASON34 = 'custrecord_rrm_prost_gleason_3_4';
    var FLD_RRM_GLEASEON43 = 'custrecord_rrm_prostate_gleason_4_3';
    var FLD_RRM_GLEASONOVER4 = 'custrecord_rrm_prostate_gle_gt43';
    var FLD_RRM_PROSTATE_OOC = 'custrecord_rrm_prostate_ooc';

    // RRM Pricing Fields
    var FLD_RRM_LISTPRICE = 'custrecord_rrm_list_price';
    var FLD_RRM_CONTRACTPRICE = 'custrecord_rrm_contract_price';
    var FLD_RRM_DISCOUNT = 'custrecord_rrm_discount_amount';
    var FLD_RRM_ACCRUALAMOUNT = 'custrecord_rrm_accrual_amount';
    var FLD_RRM_CASHAMOUNT = 'custrecord_rrm_cash_amount';
    var FLD_RRM_PRODUCTNOTRESERVED = 'custrecord_rrm_product_not_reserved';

    /**
	 * ******************END OF RRM
	 * FIELDS*************************************************
	 */

    // Transaction Fields
    var FLD_TRANS_OLI = 'custbody_order_line_item';
    var FLD_PAYMENT_BTID = 'custbody_ghi_billing_trans';
    var FLD_TRANS_CLAIM = 'custbody_claim_ticket';
    var FLD_TRAN_TIER4 = 'custbody_tier_4_plan';
    var revRec = false;

    var billPayor = nlapiGetFieldValue(FLD_PAYER);
}
/**
 * @param {String}
 *            type Operation types: create, edit, delete, xedit approve, reject,
 *            cancel (SO, ER, Time Bill, PO & RMA only) pack, ship (IF)
 *            markcomplete (Call, Task) reassign (Case) editforecast (Opp,
 *            Estimate)
 * @return {void}
 */
/*
 * function createTransactionBeforeSubmit(type) { nlapiLogExecution('debug',
 * 'checking', 'checking'); if (type == 'create') { nlapiLogExecution('debug',
 * 'checking', 'checking'); } }
 */
// createTransactionAfterSubmit1
function createTransactionAfterSubmit1(type) {
    // nlapiLogExecution('debug', 'checking after', 'checking after');
    if (type == 'create' || type == 'edit') {
        nlapiLogExecution('debug', 'testing on ', type);

    }
}

function createTransactionBeforeSubmit(type) {
    if (type == 'create' || type == 'edit') {
        var recBillTrans = nlapiGetNewRecord();
        var adjCategory = nlapiGetFieldText(FLD_ADJUSTMENT_CAT);
        // var nBillingEventType =
        // parseInt(nlapiGetFieldValue(FLD_BILLINGEVENTTYPE));
        var tBillingEventType = nlapiGetFieldText(FLD_BILLINGEVENTTYPE);
        switch (tBillingEventType) {
            case 'Bill': process_bill(); break;
            case 'Payment': process_payment(); break;
            case 'GHI Refund': processGHIRefund(); break;
            case 'Adjustment': adjustmeCategory(adjCategory); break;
                // case 2: process_reversal(); break;
        }
    }
}

/**
 *
 * @param idBillTrans
 * @param recBillTrans
 *            execute when bill event type is Bill or Re-Bill
 */

function process_bill() {

    //var billPayor = nlapiGetFieldValue(FLD_PAYER);
    var idTier4Plan = nlapiGetFieldValue(FLD_TIER4_PLAN);
    var idProduct = nlapiGetFieldValue(FLD_PRODUCT);
    var idCurrency = nlapiGetFieldValue(FLD_CURRENCY);
    var dEffectiveDate = nlapiGetFieldValue(FLD_EFFECTIVEDATE);
    var dBtserviceDate = nlapiGetFieldValue(FLD_BT_SERVICE_DATE);
    var planId = nlapiGetFieldValue("custrecord_bt_tier_4_plan");
    var idOLI = nlapiGetFieldText("custrecord_bt_oli_number")
    var myBT = nlapiGetNewRecord();
    var btId = myBT.getId();
    var payorStatus = '';
    var FlD_OLI_Value = nlapiGetFieldValue('custrecord_bt_oli_number');
    var context = nlapiGetContext();
    // rf to get the subsidiary of the payor
    var subId = nlapiLookupField('customer', billPayor, 'subsidiary');

    // Change in search here. Sales order is not required if there is no RRM
    // found
    // If There is an rrm then we will have to match the sales order and check
    // the criteria.

    /********Get the accounting period Internal from the library function********/
    var nsAcctPeriodId = getperiod(nlapiGetFieldValue('custrecord_bt_accounting_period'))

    var idrrm = 0;
    var aRRMFilter = new Array();
    nlapiLogExecution('Debug', 'ATier4', idTier4Plan);
    // First look for Tier 4 plan
    if (!isEmpty(idTier4Plan)) {
        aRRMFilter = returnRRMArray(null, idTier4Plan, idProduct, idCurrency, dEffectiveDate);
        var aSearchResults = findMatchingRecord(aRRMFilter);
    }
    //nlapiLogExecution('Debug', 'SearchResults', aSearchResults[0].getId());
    // If not found look for Tier 2 payor
    if (aSearchResults == null || aSearchResults == '') {
        nlapiLogExecution('Debug', 'Tier 2 Payor', billPayor);
        var aRRMFilter = returnRRMArray(billPayor, null, idProduct, idCurrency, dEffectiveDate);
        aSearchResults = findMatchingRecord(aRRMFilter);
    }
    if (aSearchResults != null && aSearchResults != '') {
        if (aSearchResults.length > 1) {
            nlapiSetFieldValue("custrecord_transaction_with_error", 'Multiple RRMs Found Not Processed');
            return;
        }
        idrrm = aSearchResults[0].getId();
        payorStatus = aSearchResults[0].getText(FLD_RRM_REVENUE_STATUS);
        nlapiSetFieldValue(FLD_BT_RELATED_RRM, idrrm);
        revRec = true;
    }

    //this will create an invoice enven if no RRM is found. zero value invoice
    var transactionAMT = parseFloat(nlapiGetFieldValue('custrecord_bt_transaction_amount'));
    if (!revRec || transactionAMT == 0) {
        nlapiSetFieldValue("custrecord_transaction_with_error", 'NO RRM');
        noRRM();
        return;
    }

    // Criteria section do not process the bill unless there is a match
    // between the Sales order criteria and the RRM criteria
    var aSOFilters = new Array();
    var soLookup = false;
    var soExtID = nlapiGetFieldText(FLD_OLI);

    if (!isEmpty(soExtID)) {

        ///first match on external id if found check product.  Use two seperate error messages for each search

        var soid = findSalesOrder(soExtID);
        // This could fail if the OLID is not found
        // to here is to set the error message and send this to the end of the
        // script
        if (soid > 0) {
            try {
                var salesOrderCompare = nlapiLoadRecord('salesorder', soid);

                //make sure the product is the same and set the soid
                if (salesOrderCompare.getLineItemValue('item', 'item', 1) == idProduct) {
                    nlapiSetFieldValue(ACT_RELATED_SO, soid);
                } else {
                    nlapiSetFieldValue("custrecord_transaction_with_error", 'Product does not match SO Product');
                    return;
                }
            } catch (e) {
                nlapiLogExecution('debug', e.message);
            }
        } else {
            nlapiSetFieldValue("custrecord_transaction_with_error", 'Sales Order Not Found');
            return;
        }
    } else {
        nlapiSetFieldValue("custrecord_transaction_with_error", 'NO Sales Order On BT');
        // change here to create the invoice and a fully reserved reversing
        // entry.
        return;
    }

    // If there is no sales ordr then nothing should be done for the bill
    if (!isEmpty(salesOrderCompare)) {
        soLookup = true;
        nlapiSetFieldValue(FLD_ORIG_SO, soid);
    }


    var prodExtId = nlapiLookupField('item', nlapiGetFieldValue(FLD_PRODUCT), 'externalid')
    // search for a tier 4 match frist if none lookf or payor and childacc
    // For prod we will have to get script parameters here for the products
    if (soLookup && revRec && payorStatus != 'Cash') {

        switch (prodExtId) {
            case "Colon": ColonMatching(); break;
            case "DCIS": DCISMatching(); break;
            case "IBC": IBCMatching(); break;
            case "MMR": unknowProcess(); break;
            case "Prostate": ProstateMatching(); break;
            case "Unknown": unknowProcess(); break;


        }

    }

    // IBC CRITERIA Now we are matching the RRM with the Sales Order Criteria.
    function IBCMatching() {
        var asoFilters = new Array();
        aSOFilters = ibcCriteria(idrrm, salesOrderCompare);
        var aSearchResults = findMatchingRecord(aSOFilters);
        if (aSearchResults != null && aSearchResults != '') {
            idrrm = aSearchResults[0].getId();
            revRec = true;
        } else {
            revRec = false;
            // return;
        }
    }

    // COLON CRITERIA
    function ColonMatching() {
        var asoFilters = new Array();
        aSOFilters = colonCriteria(idrrm, salesOrderCompare);
        var aSearchResults = findMatchingRecord(aSOFilters);
        if (aSearchResults != null && aSearchResults != '') {
            idrrm = aSearchResults[0].getId();
            revRec = true;
        } else {
            revRec = false;

        }
    }

    // PROSTATE CRITERIA
    function ProstateMatching() {
        var asoFilters = new Array();
        aSOFilters = prostateCriteria(idrrm, salesOrderCompare);
        var aSearchResults = findMatchingRecord(aSOFilters);
        if (aSearchResults != null && aSearchResults != '') {
            idrrm = aSearchResults[0].getId();
            revRec = true;
        } else {
            revRec = false;
        }
    }

    // DCIS
    function DCISMatching() {
        var asoFilters = new Array();
        aSOFilters = DCISCriteria(idrrm, salesOrderCompare);
        var aSearchResults = findMatchingRecord(aSOFilters);
        if (aSearchResults != null && aSearchResults != '') {
            idrrm = aSearchResults[0].getId();
            revRec = true;
        } else {
            revRec = false;
        }
    }

    // MMR Does not need to match it should just get the RRM ID
    function MMRMatching() {
        //if revRec is true then the idrrm should just be set  here
        if (revRec) {
            idrrm = idrrm;
        }
    }

    //Unknown
    function unknowProcess() {
        nlapiSetFieldValue('custrecord_transaction_with_error', 'Product Unknown Not processed');
        return;
    }

    // Read in the results from the RRM
    // var idrrm = aSearchResults[0].getId();
    var rrm = nlapiLoadRecord('customrecord_rev_rec_matrix', idrrm);
    var rrmmatch = true;

    nlapiSetFieldValue(FLD_PRODUCT_LISTPRICE, nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_LISTPRICE))));
    nlapiSetFieldValue(FLD_CONTRACTUALAMOUNT, nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CONTRACTPRICE))));
    nlapiSetFieldValue(FLD_DISCOUNT, nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_DISCOUNT))));

    // This should not be conditional copy. Need to always copy these values
    //if (rrm.getFieldText(FLD_RRM_REVENUE_STATUS) == "Accrual") {
    nlapiSetFieldValue(FLD_ACCRUALPARTIALLYRESERVED, nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_ACCRUALAMOUNT))));
    //}
    nlapiSetFieldValue(FLD_ACCRUALFULLYRESERVED, nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CASHAMOUNT))));
    // nlapiSetFieldValue('custrecord_transaction_with_error', "NO ERROR Found
    // RRM" );
    if (revRec && payorStatus != 'Cash') {
        nlapiSetFieldValue(FLD_BT_IN_CRITERIA, "T");
    }

    //Here set the NS accounting Period 
    try {
        nlapiSetFieldValue('custrecord_ghi_ns_accounting_period', nsAcctPeriodId);
    } catch (e) {
        var eMessage = e;
        nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        return;
    }


    // create transactions
    // 1.invoice
    var recInvoice = nlapiCreateRecord('invoice');
    recInvoice.setFieldValue('entity', billPayor);
    recInvoice.setFieldValue('trandate', dEffectiveDate);
    recInvoice.setFieldValue('custbody_ghi_billing_trans', btId);
    recInvoice.setFieldValue('currency', idCurrency);
    recInvoice.setFieldValue('custbody_ghi_original_sales_order', soid);
    recInvoice.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
    recInvoice.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
    recInvoice.setFieldValue(FLD_TRAN_TIER4, idTier4Plan);
    recInvoice.setFieldValue('postingperiod', nsAcctPeriodId);


    var nLines = 0;
    recInvoice.selectNewLineItem('item');
    recInvoice.setCurrentLineItemValue('item', 'item', parseInt(nlapiGetFieldValue(FLD_PRODUCT)));
    recInvoice.setCurrentLineItemValue('item', 'price', '-1');
    recInvoice.setCurrentLineItemValue('item', 'rate', parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)));
    recInvoice.setCurrentLineItemValue('item', 'custcol_contract_rate', parseFloat(rrm.getFieldValue(FLD_RRM_CONTRACTPRICE)));

    recInvoice.commitLineItem('item');
    nLines++;

    if (nLines > 0) {
        try {
            var idInvoice = nlapiSubmitRecord(recInvoice);
            nlapiSetFieldValue('custrecord_bt_related_ns_transaction', idInvoice);
            //close the sales order 
            closeSalesOrder(soid);
        } catch (e) {
            nlapiSetFieldValue('custrecord_transaction_with_error', e.message);
            return;
        }
    }

    // journal entry Biling Accrual. We should change this to look at the cash
    // vs Accrual field.
    // also on this code if the RRM is out of balance the Jounal entry will not
    // work.
    if (rrm.getFieldText(FLD_RRM_REVENUE_STATUS) == "Accrual" && revRec) {
        var recJE = nlapiCreateRecord('journalentry');
        if (idInvoice != null && idInvoice != '') {
            recJE.setFieldValue('custbody_source_sales_invoice', idInvoice);
            recJE.setFieldValue('trandate', dEffectiveDate)
            recJE.setFieldValue('subsidiary', subId);
            recJE.setFieldValue('currency', idCurrency);
            recJE.setFieldValue('postingperiod', nsAcctPeriodId);
            recJE.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
            recJE.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
        }

        // debit line 1 Account 4003
        var revAdjust = nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_ACCRUALAMOUNT)))
        // example = 4000.00 - 3000.00 =10000
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REVENUE);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(revAdjust)));
        recJE.commitLineItem('line');

        // debit line 2 acct 1215
        var allowanceDA = nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CONTRACTPRICE))) - nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_ACCRUALAMOUNT)))
        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_DA);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(allowanceDA)));
        recJE.commitLineItem('line');

        // debit line 3 acct 1212
        var alloaceAccrRev = nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_DISCOUNT)))
        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_DISCOUNT);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat((alloaceAccrRev))));
        recJE.commitLineItem('line');

        // debit line 4 account 4000
        // credit line
        // var accruedreveQuadax =
        // parseFloat(rrm.getFieldValue(FLD_RRM_CONTRACTPRICE));
        var accruedreveQuadax = (parseFloat(rrm.getFieldValue(FLD_RRM_ACCRUALAMOUNT)) + parseFloat(rrm.getFieldValue(FLD_RRM_DISCOUNT)));
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REV_QUADAX);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(accruedreveQuadax)));
        recJE.commitLineItem('line');

        // debit line 4350
        var allowDisc = nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CASHAMOUNT)));
        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_DISCOUNTS_ALLOWANCES);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(allowDisc)));
        recJE.commitLineItem('line');

        /************************************************************************************************************** */
        // debit line 4 account 1999
        // credit line
        /*Take out for over bill on 8-18-2015
                var overBillcredit = (parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)) - parseFloat(rrm.getFieldValue(FLD_RRM_LISTPRICE)));
                recJE.selectNewLineItem('line');
                recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
                recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
                recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction',idInvoice);
                recJE.setCurrentLineItemValue('line', 'account',ACT_ACCRUED_REV_QUADAX);
                recJE.setCurrentLineItemValue('line', 'debit',nlapiFormatCurrency(parseFloat(overBillcredit)));
                recJE.commitLineItem('line');

                // debit line 4000
                // var overbillDebit =
                // nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CASHAMOUNT)));
                // credit line
                recJE.selectNewLineItem('line');
                recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
                recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
                recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction',idInvoice);
                recJE.setCurrentLineItemValue('line', 'account', ACT_CLEARING);
                recJE.setCurrentLineItemValue('line', 'credit',nlapiFormatCurrency(parseFloat(overBillcredit)));
                recJE.commitLineItem('line');
        /*
                /** ************************************************************************************************************ */

        try {
            var idJE = nlapiSubmitRecord(recJE);
        } catch (e) {
            var eMessage = e;
            nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        }

        if (idJE != null && idJE != '' && idInvoice != null && idInvoice != '') {
            nlapiSetFieldValue('custrecord_created_ns_je', idJE);
            nlapiSubmitField('invoice', idInvoice, 'custbody_allowance_journal_entry', idJE);
        }
    }

    if (rrm.getFieldText(FLD_RRM_REVENUE_STATUS) == "Cash" || !revRec) {
        var recJE = nlapiCreateRecord('journalentry');

        if (idInvoice != null && idInvoice != '') {
            recJE.setFieldValue('custbody_source_sales_invoice', idInvoice);
            recJE.setFieldValue('subsidiary', subId);
            recJE.setFieldValue('custbody_ghi_billing_trans', btId);
            recJE.setFieldValue('currency', idCurrency);
            recJE.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
            recJE.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
        }

        // debit line 2 acct 1215
        var cashAmt = nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CASHAMOUNT)));
        // if this is out of criteria
        if (!revRec) {
            var cashAmt = parseFloat(rrm.getFieldValue(FLD_RRM_CASHAMOUNT)) + parseFloat(rrm.getFieldValue(FLD_RRM_ACCRUALAMOUNT));
        }

        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_DA);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(cashAmt)));
        recJE.commitLineItem('line');

        // debit line 3 acct 1212
        var discAmt = nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_DISCOUNT)))
        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_DISCOUNT);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat((discAmt))));
        recJE.commitLineItem('line');

        // debit line 4350

        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_DISCOUNTS_ALLOWANCES);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(cashAmt)));
        recJE.commitLineItem('line');

        // debit line 4000

        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REV_QUADAX);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(discAmt)));
        recJE.commitLineItem('line');

        /** ************************************************************************************************************ */
        // debit line 4 account 1999
        // credit line
        /*take out over bill on 8-19-2015
                var overBillcredit = (parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)) - parseFloat(rrm.getFieldValue(FLD_RRM_LISTPRICE)));
                recJE.selectNewLineItem('line');
                recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
                recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
                recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction',idInvoice);
                recJE.setCurrentLineItemValue('line', 'account',ACT_ACCRUED_REV_QUADAX);
                recJE.setCurrentLineItemValue('line', 'debit',nlapiFormatCurrency(parseFloat(overBillcredit)));
                recJE.commitLineItem('line');

                // debit line 4000
                // var overbillDebit =
                // nlapiFormatCurrency(parseFloat(rrm.getFieldValue(FLD_RRM_CASHAMOUNT)));
                // credit line
                recJE.selectNewLineItem('line');
                recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
                recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
                recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction',idInvoice);
                recJE.setCurrentLineItemValue('line', 'account', ACT_CLEARING);
                recJE.setCurrentLineItemValue('line', 'credit',nlapiFormatCurrency(parseFloat(overBillcredit)));
                recJE.commitLineItem('line');
        */
        try {
            var idJE = nlapiSubmitRecord(recJE);
        } catch (e) {
            var eMessage = e;
            nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        }

        if (idJE != null && idJE != '' && idInvoice != null && idInvoice != '') {
            nlapiSetFieldValue('custrecord_created_ns_je', idJE);
            nlapiSubmitField('invoice', idInvoice, 'custbody_allowance_journal_entry', idJE);
        }
    }
}

function process_payment() {

    //get the account ids from the script parameter
    var accId = new Array();
    acctId = [parseInt(ACT_ACCRUED_DISCOUNT), parseInt(ACT_ALLOWANCE_DA), parseInt(ACT_ACCOUNTS_REC), parseInt(ACT_ACCRUED_REVENUE), parseInt(ACT_TPAYMENTS), parseInt(ACT_ACCRUED_REV_QUADAX), parseInt(ACT_PAYABLE), parseInt(ACT_ACCRUED_REFUND), parseInt(ACT_DISCOUNTS_ALLOWANCES), parseInt(ACT_ALLOWANCE_BAD_DEBT)];
    var FlD_OLI_Value = nlapiGetFieldValue('custrecord_bt_oli_number');
    var idPayer = nlapiGetFieldValue(FLD_PAYER);
    var btOLI = nlapiGetFieldValue(FLD_OLI);
    var quadexTicket = nlapiGetFieldValue(FLD_QUADAX_TICKET_ID);

    var idProduct = nlapiGetFieldValue(FLD_PRODUCT);
    var idCurrency = nlapiGetFieldValue(FLD_CURRENCY);
    var dEffectiveDate = nlapiGetFieldValue(FLD_EFFECTIVEDATE);
    var sRequisitionID = nlapiGetFieldValue(FLD_REQID);
    var idBillableEventType = nlapiGetFieldValue(FLD_BILLINGEVENTTYPE);
    var subId = nlapiLookupField('customer', idPayer, 'subsidiary');
    var idPriorInvoice = null;
    var btId = nlapiGetRecordId();

    // Normal payment comes in as a negative number. Payment reversal comes in as a positive number. Both need to be negated for regular processing
    var payAmount = (parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)) * -1);
    var createPaymentAmt = (parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)) * -1);

    /********Get the accounting period Internal from the library function********/
    var nsAcctPeriodId = getperiod(nlapiGetFieldValue('custrecord_bt_accounting_period'))
    //Here set the NS accounting Period 
    try {
        nlapiSetFieldValue('custrecord_ghi_ns_accounting_period', nsAcctPeriodId);
    } catch (e) {
        var eMessage = e;
        nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        return;
    }

    var cr4350 = 0;
    var crdb1200 = 0;
    var crdb4000 = 0;
    var TB = 0;
    var DB = 0;
    var CB = 0;
    var AB = 0;
    var a2012 = 0;
    var totPay = 0;
    var cashTot = 0;
    var totAP = 0;
    var cr2012 = 0;
    var act1061 = 0;
    var db1200 = 0;
    var db1215 = 0;
    var clearing1999 = 0;
    var bal4350 = 0;
    var bal1210 = 0;
    var claimBTCashAmount = 0;
    var claimBTAccrualAmount = 0;
    var discAccount = 0;
    var newGrandTotal = 0;

    var arrActTotals = findGLAcctTotals(FlD_OLI_Value, acctId);
    if (arrActTotals) {

        for (res in arrActTotals) {
            var glACCT = parseInt(arrActTotals[res].getValue('account', null, 'group'));
            switch (glACCT) {

                case parseInt(ACT_ACCOUNTS_REC): TB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_DISCOUNT): DB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ALLOWANCE_DA): CB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REVENUE): AB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_TPAYMENTS): totPay = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REV_QUADAX): cashTot = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_PAYABLE): totAP = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REFUND): a2012 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ALLOWANCE_BAD_DEBT): bal1210 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_DISCOUNTS_ALLOWANCES): bal4350 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
            }
        }
    }

    /* Logic for processing of BT type Payment
           
       if payment >= 0 (normal payment)
       then
           if no OLI then set 1999 amount
           else 
               find matching billing transaction for claim
                   if claim BT not found, then set leave all 0s - standard payment will be made, no other distributions. Set error message on BT to "Corresponding Claim BT not found - could not distribute payment"
                   else set all balances for normal payment
                   
       else (payment < 0, reversal)
           if no OLI then set 1999 amount negated
           else set all balances for reversal payment
           
       if payment >= 0
           process payment
           find corresponding invoice
           if invoice found, then apply payment
           else set error message on BT "Corresponding invoice not found - could not apply payment"
           
       process all journal entries	
                   
    */


    if (payAmount >= 0)   // Normal payment. Originally comes in as negative payment
    {
        if (!FlD_OLI_Value) {
            clearing1999 = Math.abs(payAmount);
        }
        else {
            /*******************New Block to get data off of the corresponding invoice */
            var origBT = findMatchingRRMBill(FLD_OLI, FLD_QUADAX_TICKET_ID, FLD_BILLINGEVENTTYPE, idPayer, btOLI, quadexTicket);
            if (origBT) {
                var origJE = origBT[0].getValue('internalid');
                var newAmts = nlapiLookupField('customrecord_billing_transaction', origJE, ['custrecord_bt_accrual_partially_reserved', 'custrecord_bt_accrual_fully_reserved', 'custrecord_bt_discount']);
                // SN: Should we do parseFloat on the two lines below to get numbers?
                claimBTCashAmount = (newAmts.custrecord_bt_accrual_fully_reserved);
                claimBTAccrualAmount = (newAmts.custrecord_bt_accrual_partially_reserved);
                discAccount = (newAmts.custrecord_bt_discount);

                // Process payment into different accounts
                newGrandTotal = totPay + payAmount;

                // Check for overpayment. 
                // Journal entry variables to offset overpayment: debit(+) to 1200, credit(-) to 2012
                if (newGrandTotal > (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount))) { // Overpayment
                    if (totPay > (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount))) {
                        // We are already over expected payment bucket - put the whole payment into accrued refund
                        cr2012 = payAmount;
                        db1200 = cr2012;
                    }
                    else {
                        // Put partial payment 
                        cr2012 = newGrandTotal - (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount));
                        db1200 = cr2012;
                    }
                }
                else // Not an overpayment - journals should show zeros for 1200 and 2012. This isn't necessary since variables are being set to 0 above
                {
                    db1200 = 0;
                    cr2012 = 0;
                }

                // Calculation for cash accounts: debit(+) 1215 and credit(-) 4350 (mirrors): 
                // CB is the balance in 1215. 
                if ((newGrandTotal > parseFloat(claimBTAccrualAmount)) && (CB > 0)) { // If we have been paid over original accrual amount and we have a balance in the 1215 (cash revenue), make journal entries for cash accounts
                    if ((newGrandTotal - parseFloat(claimBTAccrualAmount)) > CB) { // We can reduce cash amounts to 0 since our new total is > accrualAmount + cash amount balance
                        db1215 = CB;
                    }
                    else { // Partially reduce cash accounts
                        db1215 = parseFloat(newGrandTotal) - parseFloat(claimBTAccrualAmount);
                    }
                } // End calculation for 1215 and 4350 
            }
            else {
                // Leaving balances to be all 0s - standard payment will be made, no other distribution
                nlapiSetFieldValue("custrecord_transaction_with_error", "Corresponding Claim BT not found - could not distribute payment");
            }
        }  // End of regular payment processing with OLI
    } // End of regular payment processing
    else  // Payment reversal. Originally comes in as positive payment
    {
        if (!FlD_OLI_Value) {
            // SN: do we need to make the same check as below - ensure that clearing 1999 account has sufficient balance?
            clearing1999 = payAmount;
        }
        else  // Begin payment reversal processing with OLI
        {
            // Make sure we were paid more than requested reversal. This includes subtracting pending AP
            totPay = totPay - totAP;
            if (Math.abs(payAmount) > totPay) {
                nlapiSetFieldValue("custrecord_transaction_with_error", "Payment error - reversal requested is too large");
                return true;
            }
            var CP = 0;
            CP = totPay - AB - a2012;
            // This is always correct
            act1061 = payAmount;
            if (a2012 >= Math.abs(payAmount)) {
                // If we have more money in 2012 (refund) than payment reversal requested, take it out from there
                cr2012 = payAmount;
                db1200 = 0;
                db1215 = 0;
            }
            else {
                // If we don't have enough (or any) money in 2012, need to do the math. For now, set to 0. 
                cr2012 = 0;
                // We also need to put a balance in 1200, which we don't need to do if we had a refund. Not sure this math is right - it will not likely work for partial amount in 2012
                db1200 = (Math.abs(payAmount)) < (a2012) ? (Math.abs(payAmount) * -1) : (a2012) * -1;
                // We also need to put a balance in 1215 and 4350, which we don't need to do if we had a refund. Not sure this math is right - it will not likely work for partial amount in 2012
                db1215 = (Math.abs(payAmount)) - a2012 > 0 ? (Math.abs(payAmount)) - a2012 > CP ? (CP) * -1 : ((Math.abs(payAmount)) - (a2012)) * -1 : 0;

                // Test math goes here
                cr2012 = a2012 * -1;
                // SN - I wonder if we need to do this only up to the original RRM cash amount - verify with Tanya
                // If that's the case, than calculation for db1200 will change as well
                db1215 = (Math.abs(payAmount) - cr2012) * -1;
                db1200 = Math.abs(payAmount) - cr2012;

                // End test math
            }

        } // End of payment reversal processing with OLI
    } // End of payment reversal processing

    /*  Start commended out original code
        //  New Block to get data off of the corresponding invoice //
        var origBT = findMatchingRRMBill(FLD_OLI, FLD_QUADAX_TICKET_ID, FLD_BILLINGEVENTTYPE, idPayer, btOLI, quadexTicket);
        if (origBT) {
            var origJE = origBT[0].getValue('internalid');
            var newAmts = nlapiLookupField('customrecord_billing_transaction', origJE, ['custrecord_bt_accrual_partially_reserved', 'custrecord_bt_accrual_fully_reserved', 'custrecord_bt_discount']);
            claimBTCashAmount = (newAmts.custrecord_bt_accrual_fully_reserved);
            claimBTAccrualAmount = (newAmts.custrecord_bt_accrual_partially_reserved);
            discAccount = (newAmts.custrecord_bt_discount);
        }
    
        var CashAccrualDisc = parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount) + parseFloat(discAccount);
    
        // Calulate the balance in the gL accounts for this Olid before creating
        // Journals or Payments
        // for normal paymtens this number will always be positive. so do normal
        // logic.
        if (payAmount > 0) {
            //totPay = totPay - totAP;
    
        }
        var w = (TB - DB);
        //var postToAccruedRefund;
        if (totPay > 0) {
            newGrandTotal = totPay + payAmount
        }
    
        if (!FlD_OLI_Value) {
            clearing1999 = Math.abs(payAmount);
        }
        //postToAccruedRefund = Math.abs(payAmount) - w;
    
        // by pass all of this if
        //Let us use this for cash over payment
        if (TB > DB) {
            db1200 = payAmount > (AB + cashTot) ? payAmount - (AB + cashTot) : 0;       // This should be for the total payment
            cr2012 = payAmount > (AB + cashTot) ? payAmount - (AB + cashTot) : 0;       // This should be for the total payment
            db1215 = payAmount > AB ? (payAmount - AB) > CB ? CB : payAmount - AB : 0;  //This should be payment - amount in 1061
            cr4350 = payAmount > AB ? (payAmount - AB) > CB ? CB : payAmount - AB : 0;  //This should be payment - amount in 1061
        }
    
        //if the is a cash payor then claimBTAccrualAmount ==0 except that the pay amount will need to be converted before we do th 
        //calcuation.
        //  if (claimBTAccrualAmount == 0) {
        //     db1200 = TB-payAmount;
        //      cr2012 = TB-payAmount;
        //      db1215 = TB;
        //     cr4350 = TB;
        //      }
    
        // Check for overpayment. 
        // Journal entry variables to offset overpayment: debit(+) to 1200, credit(-) to 2012
        if (newGrandTotal > (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount))) {
            if (totPay > (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount))) {
                // We are already over expected payment bucket - put the whole payment into accrued refund
                cr2012 = payAmount;
                db1200 = cr2012;
            }
            else {
                // Put partial payment 
                cr2012 = newGrandTotal - (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount));
                db1200 = cr2012;
            }
        }
        else // Not an overpayment - journals should show zeros for 1200 and 2012. This isn't necessary since variables are being set to 0 above
        {
            db1200 = 0;
            cr2012 = 0;
        }
    
        // Calculation for cash accounts: debit(+) 1215 and credit(-) 4350 (mirrors): 
        // CB is the balance in 1215. 
        if ((newGrandTotal > parseFloat(claimBTAccrualAmount)) && (CB > 0)) {
            if ((newGrandTotal - parseFloat(claimBTAccrualAmount)) > CB) {
                db1215 = CB;
            }
            else {
                db1215 = parseFloat(newGrandTotal) - parseFloat(claimBTAccrualAmount);
            }
    
        }
    
    
    
        ////over payment make this 
        if ((TB <= DB) && FlD_OLI_Value) {
            //change with new if statement to be pay amount - AB
            //  db1200 = payAmount - AB;
            //  cr2012 = payAmount - AB;
        }
    
        //Calculations for write off should be. these are zero balances with payments.
        //if the following is true then don't make an entry
        //09/14/2015 change from (TB ==0 && (totPay) == 0)
        // if (totPay <= (parseFloat(claimBTCashAmount) + parseFloat(claimBTAccrualAmount)) && TB==0) {
        //if ((TB == 0 || (totPay - TB) == 0)) {
        //Sonya new Logic
        //            db1200 = createPaymentAmt <= CashAccrualDisc ? (createPaymentAmt * -1) : CashAccrualDisc;
        //          db1215 = TB - bal1210 > 0 ? TB - bal1210 : 0;
        //          cr4350 = TB - bal1210 > 0 ? TB - bal1210 : 0;
        //          cr2012 = createPaymentAmt > db1200 ? createPaymentAmt - db1200 : 0;
    
        
        //           db1200 = payAmount > AB ? (payAmount - AB) : 0;
        //           cr2012 = payAmount > AB ? (payAmount - AB) : 0; 
        //           db1215 = payAmount > AB ? (payAmount - AB)  : 0;
        //           cr4350 = payAmount > AB ? (payAmount - AB)  : 0;
        // }
    
    
    
        // FOR REVERSAL HERE IS THE LOGIC.
        if (payAmount < 0) {
            if (!FlD_OLI_Value) {
                clearing1999 = payAmount;
            }
            else {
                // Make sure we were paid more than requested reversal. This includes subtracting pending AP
                totPay = totPay - totAP;
                if (Math.abs(payAmount) > totPay && (FlD_OLI_Value)) {
                    nlapiSetFieldValue("custrecord_transaction_with_error", "Payment error - reversal requested is too large");
                    return true;
                }
                // var unaccruedRefund = 0;
                var CP = 0;
                // unaccruedRefund = payAmount - accruedRefund;
                CP = totPay - AB - a2012;
                //var w = (TB - DB);
                // This is always correct
                act1061 = payAmount;
                if (a2012 >= Math.abs(payAmount)) {
                    // If we have more money in 2012 (refund) than payment reversal requested, take it out from there
                    // SN: this is not complete. We need to do the math on the else - 0 is not correct
                    cr2012 = payAmount;
                    db1200 = 0;
                    db1215 = 0;
                }
                else {
                    // If we don't have enough (or any) money in 2012, need to do the math. For now, set to 0. 
                    cr2012 = 0;
                    // We also need to put a balance in 1200, which we don't need to do if we had a refund. Not sure this math is right - it will not likely work for partial amount in 2012
                    db1200 = (Math.abs(payAmount)) < (a2012) ? (Math.abs(payAmount) * -1) : (a2012) * -1;
                    // We also need to put a balance in 1215 and 4350, which we don't need to do if we had a refund. Not sure this math is right - it will not likely work for partial amount in 2012
                    db1215 = (Math.abs(payAmount)) - a2012 > 0 ? (Math.abs(payAmount)) - a2012 > CP ? (CP) * -1 : ((Math.abs(payAmount)) - (a2012)) * -1 : 0;
                }
            
                //db1200 = (Math.abs(payAmount)) < (a2012) ? (Math.abs(payAmount) * -1) : (a2012) * -1;
                //db1215 = (Math.abs(payAmount)) - a2012 > 0 ? (Math.abs(payAmount)) - a2012 > CP ? (CP) * -1 : ((Math.abs(payAmount)) - (a2012)) * -1 : 0;
                // If we have more money in 2012 (refund) than payment reversal requested, take it out from there
                // SN: this is not complete. We need to do the math on the else - 0 is not correct
                //cr2012 = a2012 >= Math.abs((payAmount)) ? payAmount : 0;
            
            }
        }
    End original code  */

    // now the create Payment section
    // requirement to search for the invoice using ticket id as well
    // only search for a payment if there is an olid
    // create transactions; assumptions
    if (payAmount >= 0) { // Begin create payment for regular payment
        var recCustomerPayment = nlapiCreateRecord('customerpayment', { entity: idPayer });
        recCustomerPayment.setFieldValue('customer', idPayer);
        recCustomerPayment.setFieldValue('currency', idCurrency);
        recCustomerPayment.setFieldValue('custbody_ghi_billing_trans', btId);
        recCustomerPayment.setFieldValue('trandate', dEffectiveDate);
        recCustomerPayment.setFieldValue('postingperiod', nsAcctPeriodId);
        recCustomerPayment.setFieldValue('aracct', ACT_ACCOUNTS_REC);
        recCustomerPayment.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
        recCustomerPayment.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);

        // set payment amount
        if (payAmount != null && payAmount != '') {
            nlapiLogExecution('debug', 'payment amount', (createPaymentAmt));
            recCustomerPayment.setFieldValue('payment', nlapiFormatCurrency((parseFloat(createPaymentAmt))));
        }
        try {
            var idCustomerPayment = nlapiSubmitRecord(recCustomerPayment);
        } catch (e) {
            var eMessage = e;
            nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
            return;
        }

        // SN: Do we need to keep checking idCustomerPayment here? Won't it error out in the catch above?
        if (idCustomerPayment != null && idCustomerPayment != '') {
            nlapiSetFieldValue('custrecord_bt_related_ns_transaction', idCustomerPayment);
        }

        // If there is a payment search for a related invoice for the
        // application.
        //
        var aSearchResults = findMatchingInvoice();
        // SN: Do we need to keep checking idCustomerPayment here? Won't it error out in the catch above?
        if ((idCustomerPayment) && aSearchResults != null && aSearchResults != '') {
            for (res in aSearchResults) {
                // looking for related invoice
                idPriorInvoice = aSearchResults[0].getId();
            }

            if (idPriorInvoice != null && idPriorInvoice != '') {

                var recCustPayment = nlapiLoadRecord('customerpayment', idCustomerPayment);

                nlapiLogExecution('debug', 'idPriorInvoice', idPriorInvoice);
                var nLines = recCustPayment.getLineItemCount('apply');

                nlapiLogExecution('debug', 'nlines', nLines);
                for (var i = 1; i <= nLines; i++) {
                    nlapiLogExecution('debug', 'doc', recCustPayment.getLineItemValue('apply', 'doc', i));
                    if (recCustPayment.getLineItemValue('apply', 'doc', i) == idPriorInvoice) {
                        nlapiLogExecution('debug', 'payment', 'payment');
                        recCustPayment.setLineItemValue('apply', 'apply', i, 'T');

                        if (parseFloat(recCustPayment.getLineItemValue('apply', 'total', i)) <= parseFloat(createPaymentAmt)) {
                            recCustPayment.setLineItemValue('apply', 'amount', i, nlapiFormatCurrency(parseFloat(recCustPayment.getLineItemValue('apply', 'total', i))));
                        } else if (parseFloat(recCustPayment.getLineItemValue('apply', 'total', i)) > parseFloat(createPaymentAmt)) {
                            recCustPayment.setLineItemValue('apply', 'amount', i, nlapiFormatCurrency(parseFloat(createPaymentAmt)));
                            if ((parseFloat(recCustPayment.getLineItemValue('apply', 'total', i)) - parseFloat(createPaymentAmt)) <= 10) {
                                recCustPayment.setLineItemValue('apply', 'disc', i, nlapiFormatCurrency((parseFloat(recCustPayment.getLineItemValue('apply', 'total', i)) - parseFloat(createPaymentAmt))));
                            }
                        }
                    }
                }

                try {
                    var idCustomerPayment = nlapiSubmitRecord(recCustPayment);
                } catch (e) {
                    var eMessage = e;
                    nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
                    return;
                }

            } // End if (idPriorInvoice != null && idPriorInvoice != '')
            else // Could not find related invoice - payment not applied to invoice. This error handling is not good - we should have a single "not found" statement
            {
                nlapiSetFieldValue('custrecord_transaction_with_error', "Related invoice not found - could not apply payment (inner)");
            }
        } // End  if ((idCustomerPayment) && aSearchResults != null && aSearchResults != '')
        else // Could not find related invoice - payment not applied to invoice . This error handling is not good - we should have a single "not found" statement
        {
            nlapiSetFieldValue('custrecord_transaction_with_error', "Related invoice not found - could not apply payment (outer)");
        }
    } // End create payment for regular payment

    // If a payment was created create a Journal Entry
    if ((idCustomerPayment != null && idCustomerPayment != '') || payAmount < 0) {

        var recJE = nlapiCreateRecord('journalentry');
        // recJE.setFieldValue('custbody_source_sales_invoice', idPriorInvoice);
        recJE.setFieldValue('subsidiary', subId);
        recJE.setFieldValue('custbody_ghi_billing_trans', btId);
        recJE.setFieldValue('currency', idCurrency);
        recJE.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
        recJE.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
        recJE.setFieldValue('trandate', dEffectiveDate);
        recJE.setFieldValue('postingperiod', nsAcctPeriodId);

        // debit line 1061
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_TPAYMENTS);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(act1061)));
        recJE.commitLineItem('line');

        // credit line 1200
        //this entry will only be made for reversals
        /* SN - comment out for now. I don't think we need it with right math
               if (payAmount < 0) {
                   recJE.selectNewLineItem('line');
                   recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
                   recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
                   recJE.setCurrentLineItemValue('line', 'account', ACT_ACCOUNTS_REC);
                   recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(db1200)));
                   recJE.commitLineItem('line');
               }
       */
        // debit line 1200
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCOUNTS_REC);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(db1200));
        recJE.commitLineItem('line');

        // credit line 2012
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REFUND);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(cr2012)));
        recJE.commitLineItem('line');

        // debit line 1215
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_DA);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(db1215)));
        recJE.commitLineItem('line');

        // credit line 4350
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_DISCOUNTS_ALLOWANCES);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(db1215)));
        recJE.commitLineItem('line');

        /**
         * ************** new line for the 1999 used for payments without OLI (unidentified, tax, interest)
         * ********************************************
         */
        // line 9 1999
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_CLEARING);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(clearing1999)));
        recJE.commitLineItem('line');

        // line ACCounts Rece
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCOUNTS_REC);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(clearing1999)));
        recJE.commitLineItem('line');

        try {
            var idJE = nlapiSubmitRecord(recJE);
        } catch (e) {
            nlapiSetFieldValue('custrecord_transaction_with_error', e.message);
            return;
        }
        if (idJE != null && idJE != '') {
            nlapiSetFieldValue('custrecord_created_ns_je', idJE);
        }
    }

}

function process_adjustment() {
    // Get Script Parameters

    // make sure the accounts are integers for retrieving balnces
    // get the account ids from the script parameters
    var acctId = [parseInt(ACT_ACCRUED_DISCOUNT), parseInt(ACT_ALLOWANCE_DA), parseInt(ACT_ACCOUNTS_REC), parseInt(ACT_ACCRUED_REVENUE), parseInt(ACT_TPAYMENTS), parseInt(ACT_CLEARING), parseInt(ACT_ACCRUED_REV_QUADAX), parseInt(ACT_ALLOWANCE_BAD_DEBT), parseInt(ACT_PAYABLE), parseInt(ACT_ACCRUED_REFUND)];
    var FlD_OLI_Value = nlapiGetFieldValue('custrecord_bt_oli_number');
    var idPayer = nlapiGetFieldValue(FLD_PAYER);
    var idBillableEventType = nlapiGetFieldValue(FLD_BILLINGEVENTTYPE);
    var subId = nlapiLookupField('customer', idPayer, 'subsidiary');
    var idPriorInvoice = null;
    var btId = nlapiGetRecordId();
    var idCurrency = nlapiGetFieldValue(FLD_CURRENCY);
    var dEffectiveDate = nlapiGetFieldValue(FLD_EFFECTIVEDATE);
    var idProduct = nlapiGetFieldValue(FLD_PRODUCT);

    var adjustmentCategory = nlapiGetFieldText(FLD_ADJUSTMENT_CAT);
    /********Get the accounting period Internal from the library function********/
    var nsAcctPeriodId = getperiod(nlapiGetFieldValue('custrecord_bt_accounting_period'))
    //Here set the NS accounting Period 
    try {
        nlapiSetFieldValue('custrecord_ghi_ns_accounting_period', nsAcctPeriodId);
    } catch (e) {
        var eMessage = e;
        nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        return;
    }

    var db1200 = 0;
    var db1212 = 0;
    var db1215 = 0;
    var cr4350 = 0;
    var cr1210 = 0;
    var cr2012 = 0;
    var crdb1200 = 0;
    var crdb4000 = 0;
    var wo1215 = 0;
    var wo4000 = 0;
    var woa4000 = 0;
    var wob4000 = 0;
    var bal1999 = 0;
    var bal4000 = 0;
    var cr1999 = 0;
    var bal1210 = 0;
    var wo1212 = 0;
    var creitmemoentry = 0;
    var balap2000 = 0;
    var nat1999 = 0;
    var clearing1999 = 0;

    // Before creating a payment we need to get the account balances and assign
    // them to variables
    // payment is between accrual and contract
    // if ((nlapiGetFieldValue(FLD_PAYMENTAMOUNT)) <=
    // rrm.getFieldValue(FLD_RRM_CONTRACTPRICE) &&
    // nlapiGetFieldValue(FLD_PAYMENTAMOUNT)
    // >=rrm.getFieldValue(FLD_RRM_ACCRUALAMOUNT)) {
    var adjAmt = parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT));
    var amtAdjusted = parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)) * -1;
    var unpaidAccural = 0;
    var TB = 0;
    var DB = 0;
    var CB = 0;
    var AB = 0;
    var a2012 = 0;
    var totPay = 0;

    // get the glbalances for the OLId
    var arrActTotals = findGLAcctTotals(FlD_OLI_Value, acctId);
    if (arrActTotals) {

        for (res in arrActTotals) {
            var glACCT = parseInt(arrActTotals[res].getValue('account', null, 'group'));
            switch (glACCT) {

                case parseInt(ACT_ACCOUNTS_REC): TB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_DISCOUNT): DB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ALLOWANCE_DA): CB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REVENUE): AB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_TPAYMENTS): totPay = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_CLEARING): bal1999 = (parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REV_QUADAX): bal4000 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ALLOWANCE_BAD_DEBT): bal1210 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_PAYABLE): balap2000 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
            }
        }
    }

    if (amtAdjusted > 0) {
        creitmemoentry = 0;
        adjAmt = Math.abs(adjAmt) + Math.abs(bal1999);
        unpaidAccural = AB > (totPay - balap2000) ? (AB - (totPay - balap2000)) : 0;

        clearing1999 = Math.abs(adjAmt) < (Math.abs(bal1999)) ? (Math.abs(adjAmt) * (bal1999 / (Math.abs(bal1999)))) : bal1999;

        // if (Math.abs(adjAmt) > (Math.abs(bal1999))) {
        wo1212 = (Math.abs(adjAmt)) < DB ? Math.abs(adjAmt) : DB;
        // }

        if (Math.abs(adjAmt) > (DB)) {
            wo1215 = (Math.abs(adjAmt) - (DB)) > CB ? CB : Math.abs(adjAmt) - (DB);
        }
        if (Math.abs(adjAmt) > (CB + DB) && unpaidAccural > 0) {
            cr1210 = Math.abs(adjAmt) - (DB + CB) < unpaidAccural ? Math.abs(adjAmt) - (DB + CB) : unpaidAccural;
        }
        if (Math.abs(adjAmt) > (unpaidAccural) + (CB + DB)) {
            cr1999 = (Math.abs(adjAmt) - (unpaidAccural + CB + DB));
        }
        //This is for a full adjustment type gh04
        if (adjustmentCategory == 'GH04') {
            cr1999 = 0;
            cr1210 = AB;
        }


    }
    // This is the logic for the reversal of an ajustment. When the adjustment
    // is positive.
    // change here math answer for 1099 math.abs 7-24-2015
    if (amtAdjusted < 0) {

        creitmemoentry = Math.abs(amtAdjusted);
        cr1999 = Math.abs(adjAmt) > (Math.abs(bal1999)) ? ((Math.abs(bal1999)) * -1) : (Math.abs(adjAmt) * -1);
        cr1210 = Math.abs(adjAmt) - (Math.abs(bal1999)) > 0 ? Math.abs(adjAmt) - (Math.abs(bal1999)) > bal1210 ? (bal1210 * -1) : (Math.abs(adjAmt) - (Math.abs(bal1999))) * -1 : 0;
        wo1215 = Math.abs(adjAmt) - (Math.abs(bal1999)) - bal1210 > 0 ? (Math.abs(adjAmt) - (Math.abs(bal1999)) - bal1210) * -1 : 0;
    }

    // create credit memo

    if (amtAdjusted > 0) {
        var recCreditMemo = nlapiCreateRecord('creditmemo');
        recCreditMemo.setFieldValue('entity', idPayer);
        recCreditMemo.setFieldValue('trandate', dEffectiveDate);
        recCreditMemo.setFieldValue('custbody_ghi_billing_trans', btId);
        recCreditMemo.setFieldValue('currency', idCurrency);
        recCreditMemo.setFieldValue('account', ACT_ACCOUNTS_REC);
        recCreditMemo.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
        recCreditMemo.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
        recCreditMemo.setFieldValue('postingperiod', nsAcctPeriodId);

        // add lines
        recCreditMemo.selectNewLineItem('item');
        recCreditMemo.setCurrentLineItemValue('item', 'item', parseInt(nlapiGetFieldValue(FLD_PRODUCT)));
        recCreditMemo.setCurrentLineItemValue('item', 'price', '-1');
        recCreditMemo.setCurrentLineItemValue('item', 'rate', (Math.abs(parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT)))));
        recCreditMemo.setCurrentLineItemValue('item', 'custcol_contract_rate', Math.abs(parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT))));
        recCreditMemo.commitLineItem('item');

        try {
            var idCreditMemo = nlapiSubmitRecord(recCreditMemo);
            nlapiSubmitField('creditmemo', idCreditMemo, 'custbody_allowance_journal_entry', idJE);
        } catch (e) {
            var eMessage = e;
            nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
            return;
        }


    }

    if (idCreditMemo != null && idCreditMemo != '' || amtAdjusted < 0) {
        nlapiSetFieldValue('custrecord_bt_related_ns_transaction', idCreditMemo);

        // Create the Journal Entry
        var recJE = nlapiCreateRecord('journalentry');
        recJE.setFieldValue('subsidiary', subId);
        recJE.setFieldValue('custbody_ghi_billing_trans', btId);
        recJE.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
        recJE.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
        recJE.setFieldValue('trandate', dEffectiveDate);
        recJE.setFieldValue('postingperiod', nsAcctPeriodId);

        // line 1 DEBIT 1200
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCOUNTS_REC);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(creitmemoentry)));
        recJE.commitLineItem('line');

        // line 2 CREDIT 4000
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REV_QUADAX);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(creitmemoentry)));
        recJE.commitLineItem('line');

        // line 3 1212
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_DISCOUNT);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(wo1212)));
        recJE.commitLineItem('line');

        // line 4 4000
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REV_QUADAX);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(wo1212)));
        recJE.commitLineItem('line');

        // line 5 wo1210
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_DA);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(wo1215)));
        recJE.commitLineItem('line');

        // line 6 1215
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_DISCOUNTS_ALLOWANCES);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(wo1215)));
        recJE.commitLineItem('line');

        // line 7 wo1210
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_BAD_DEBT);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(cr1210)));
        recJE.commitLineItem('line');

        // line 8 4000
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REV_QUADAX);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(cr1210)));
        recJE.commitLineItem('line');

        // line 9 1999
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_CLEARING);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(cr1999)));
        recJE.commitLineItem('line');

        // line 10 4000
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REV_QUADAX);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(cr1999)));
        recJE.commitLineItem('line');

        /**
         * **************new linew for the 1999 under charg tak out 8/19 for over and under pay
         * ********************************************

        // line 9 1999
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        // recJE.setCurrentLineItemValue('line',
        // 'custcol_associated_transaction', idCreditMemo);
        recJE.setCurrentLineItemValue('line', 'account', ACT_CLEARING);
        recJE.setCurrentLineItemValue('line', 'credit',nlapiFormatCurrency(parseFloat(clearing1999)));
        recJE.commitLineItem('line');

        // line ACCounts Rece
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        // recJE.setCurrentLineItemValue('line',
        // 'custcol_associated_transaction', idCreditMemo);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ACCOUNTS_REC);
        recJE.setCurrentLineItemValue('line', 'debit',nlapiFormatCurrency(parseFloat(clearing1999)));
        recJE.commitLineItem('line');
        */

        try {
            var idJE = nlapiSubmitRecord(recJE)
        } catch (e) {
            var eMessage = e;
            nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
            return;
        }
        if (idJE != null && idJE != '') {
            nlapiSetFieldValue('custrecord_created_ns_je', idJE);
        }
    }
}

function processGHIRefund() {
    // Get Script Parameters
    var context = nlapiGetContext();
    var acctId = [parseInt(ACT_ACCRUED_DISCOUNT), parseInt(ACT_ALLOWANCE_DA), parseInt(ACT_ACCOUNTS_REC), parseInt(ACT_ACCRUED_REVENUE), parseInt(ACT_TPAYMENTS), parseInt(ACT_ACCRUED_REFUND), parseInt(ACT_PAYABLE), parseInt(ACT_ALLOWANCE_BAD_DEBT)];
    var FlD_OLI_Value = nlapiGetFieldValue('custrecord_bt_oli_number');
    var idPayer = nlapiGetFieldValue(FLD_PAYER);
    var idBillableEventType = nlapiGetFieldValue(FLD_BILLINGEVENTTYPE);
    var subId = nlapiLookupField('customer', idPayer, 'subsidiary');
    var idPriorInvoice = null;
    // var aSearchResults = findMatchingRecordBT_1();
    var btId = nlapiGetRecordId();
    var idCurrency = nlapiGetFieldValue(FLD_CURRENCY);
    var dEffectiveDate = nlapiGetFieldValue(FLD_EFFECTIVEDATE);
    var idProduct = nlapiGetFieldValue(FLD_PRODUCT);

    var db1200 = 0;
    var db1212 = 0;
    var db1215 = 0;
    var cr4350 = 0;
    var cr1210 = 0;
    var cr2012 = 0;
    var crdb1200 = 0;
    var crdb4000 = 0;
    var wo1215 = 0;
    var wo4000 = 0;
    var woa4000 = 0;
    var wob4000 = 0;
    var cr1999 = 0;
    var ap2000 = 0;
    var accruedRefund = 0;
    var wo1212 = 0;
    var wo1200 = 0;
    var bal1210 = 0;

    // Before creating a payment we need to get the account balances and assign
    // them to variables
    // payment is between accrual and contract

    /********Get the accounting period Internal from the library function********/
    var nsAcctPeriodId = getperiod(nlapiGetFieldValue('custrecord_bt_accounting_period'))
    //Here set the NS accounting Period 
    try {
        nlapiSetFieldValue('custrecord_ghi_ns_accounting_period', nsAcctPeriodId);
    } catch (e) {
        var eMessage = e;
        nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        return;
    }
    var ghiRefAmt = parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT));

    if (ghiRefAmt < 0) {
        nlapiSetFieldValue("custrecord_transaction_with_error", "Please Process Manually");
        return true;
    }

    var arrActTotals = findGLAcctTotals(FlD_OLI_Value, acctId);
    if (arrActTotals) {
        var TB = 0;
        var DB = 0;
        var CB = 0;
        var AB = 0;
        var a2012 = 0;
        var totPay = 0;

        for (res in arrActTotals) {
            var glACCT = parseInt(arrActTotals[res].getValue('account', null, 'group'));
            switch (glACCT) {

                case parseInt(ACT_ACCOUNTS_REC): TB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_DISCOUNT): DB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ALLOWANCE_DA): CB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REVENUE): AB = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_TPAYMENTS): totPay = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ACCRUED_REFUND): accruedRefund = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_PAYABLE): ap2000 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
                case parseInt(ACT_ALLOWANCE_BAD_DEBT): bal1210 = Math.abs(parseFloat(arrActTotals[res].getValue('amount', null, 'sum'))); break;
            }
        }
    }

    var unaccruedRefund = 0;
    var CP = 0;

    unaccruedRefund = ghiRefAmt - accruedRefund;
    CP = (AB - totPay - ap2000 - accruedRefund - bal1210);

    wo1212 = ghiRefAmt < DB ? ghiRefAmt : DB;
    wo1200 = ghiRefAmt < DB ? ghiRefAmt : DB;

    // look at the Cash accrual balance
    if (accruedRefund > 0 && ghiRefAmt <= accruedRefund) {
        cr2012 = ghiRefAmt;
        ap2000 = ghiRefAmt;
    }
    if (accruedRefund > 0 && (ghiRefAmt > accruedRefund)) {
        db1200 = unaccruedRefund;
        ap2000 = ghiRefAmt;
        cr2012 = accruedRefund;
        db1215 = CP < unaccruedRefund ? CP : unaccruedRefund;
        cr4350 = CP < unaccruedRefund ? CP : unaccruedRefund;
    }

    if (accruedRefund == 0) {
        db1200 = unaccruedRefund;
        ap2000 = ghiRefAmt;
        //below out because if we have accruedRefund = 0 then just take the payment
        //changing below so we do not remove cash balance
        db1215 = CP < unaccruedRefund ? (CP) : unaccruedRefund;
        cr4350 = CP < unaccruedRefund ? (CP) : unaccruedRefund;
        //db1215 = CP - CB < unaccruedRefund ? (CP - CB) : unaccruedRefund;
        //cr4350 = CP - CB < unaccruedRefund ? (CP - CB) : unaccruedRefund;
        // db1215 = ghiRefAmt;
    }

    var recJE = nlapiCreateRecord('journalentry');
    recJE.setFieldValue('subsidiary', subId);
    recJE.setFieldValue('custbody_ghi_billing_trans', btId);
    recJE.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));
    recJE.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
    recJE.setFieldValue('trandate', dEffectiveDate);
    recJE.setFieldValue('postingperiod', nsAcctPeriodId);



    // line 1 Accounts Payable
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
    recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
    recJE.setCurrentLineItemValue('line', 'account', ACT_PAYABLE);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(ap2000)));
    recJE.commitLineItem('line');

    // line 2 Accrued Refund
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
    recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
    recJE.setCurrentLineItemValue('line', 'account', ACT_ACCRUED_REFUND);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(cr2012)));
    recJE.commitLineItem('line');

    // line 3 1215
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
    recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
    recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_DA);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(db1215)));
    recJE.commitLineItem('line');

    // line 4 4350
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
    recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
    recJE.setCurrentLineItemValue('line', 'account', ACT_DISCOUNTS_ALLOWANCES);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(db1215)));
    recJE.commitLineItem('line');

    // line 5 1200
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
    recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
    recJE.setCurrentLineItemValue('line', 'account', ACT_ACCOUNTS_REC);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(db1200)));
    recJE.commitLineItem('line');

    try {
        var idJE = nlapiSubmitRecord(recJE)
    } catch (e) {
        var eMessage = e;
        nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        return;
    }

    if (idJE != null && idJE != '') {
        nlapiSetFieldValue('custrecord_created_ns_je', idJE);
    }
}

// Finds matching revenu recognition based on a really big filter.
function findMatchingRecord(bigFilter) {
    var aSearchColumns = new Array();
    aSearchColumns.push(new nlobjSearchColumn('internalid'));
    aSearchColumns.push(new nlobjSearchColumn(FLD_RRM_REVENUE_STATUS));

    try {
        var aSearchResults = nlapiSearchRecord(REC_RRM, null, bigFilter, aSearchColumns);
        return aSearchResults;
    } catch (e) {
        nlapiLogExecution('debug', 'search error', e.message)
    }
}

/**
 * Return true if value is null, empty string, or undefined
 *
 * @param stValue
 * @returns {Boolean}
 */
function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }
    return false;
}

// Gets GL Account totals based on OLIT
function findGLAcctTotals(oliT, acctId) {
    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('account', null, 'is', acctId));
    aSearchFilters.push(new nlobjSearchFilter('custbody_order_line_item', null, 'is', oliT));
    aSearchFilters.push(new nlobjSearchFilter('type', null, 'noneof', 'SalesOrd'));

    var aSearchColumns = new Array();
    aSearchColumns.push(new nlobjSearchColumn('account', null, 'Group'));
    aSearchColumns.push(new nlobjSearchColumn('amount', null, 'sum'));

    try {
        var aSearchResults = nlapiSearchRecord('transaction', null, aSearchFilters, aSearchColumns);
        return aSearchResults;
    } catch (e) {
        nlapiLogExecution('debug', 'search error', e.message)
    }
}

// Payment looks for matching bill
function findMatchingInvoice() {
    var idPayer = nlapiGetFieldValue(FLD_PAYER);
    var btOLI = nlapiGetFieldValue(FLD_OLI);
    var quadexTicket = nlapiGetFieldValue(FLD_QUADAX_TICKET_ID);


    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('entity', null, 'is', idPayer));
    aSearchFilters.push(new nlobjSearchFilter(FLD_TRANS_OLI, null, 'is', btOLI));
    aSearchFilters.push(new nlobjSearchFilter(FLD_TRANS_CLAIM, null, 'is', quadexTicket));
    // aSearchFilters.push(new nlobjSearchFilter(FLD_BILLINGEVENTTYPE, null,
    // 'anyof', 1)); //either bill

    var aSearchColumns = new Array();
    aSearchColumns.push(new nlobjSearchColumn('internalid'));
    try {
        var aSearchResults = nlapiSearchRecord('transaction', null, aSearchFilters, aSearchColumns);
        return aSearchResults;
    } catch (e) {
        nlapiLogExecution('debug', 'search error', e.message)
    }
}


// Find Sales orer internal id from external id
function findSalesOrder(extId) {

    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('externalid', null, 'is', extId));
    aSearchFilters.push(new nlobjSearchFilter('type', null, 'is', 'SalesOrd'));
    aSearchFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
    //aSearchFilters.push(new nlobjSearchFilter('internalid', 'item', 'is', prodId));

    var aSearchColumns = new Array();
    aSearchColumns.push(new nlobjSearchColumn('internalid'));
    aSearchColumns.push(new nlobjSearchColumn('type'));

    var aSearchResults = nlapiSearchRecord('transaction', null, aSearchFilters, aSearchColumns);
    if (aSearchResults) {
        return aSearchResults[0].getId();
    } else {
        return 0;
    }

}

// Generic matching
function returnRRMArray(childAcct, tier4Payor, idProduct, idCurrency, dBTeffectiveDate) { // ,salesOrderCompare) {

    nlapiLogExecution('Debug', 'Searchfor this', childAcct);
    nlapiLogExecution('Debug', 'Currency ', idCurrency);

    var aSearchFilters = new Array();
    if (childAcct != null) {
        nlapiLogExecution('Debug', 'Shold look for Tier 2 ', childAcct);
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_CHILDACC, null, 'is', childAcct));
    }

    if (tier4Payor != null) {
        nlapiLogExecution('Debug', 'Shold not look for Tier 4 ', tier4Payor);
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_TIER4_PAYOR, null, 'is', tier4Payor));
    }

    // First search for Tier 4 payor, if not found search for Child acct
    aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_PRODUCT, null, 'is', idProduct));
    aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_CURRENCY, null, 'is', idCurrency));

    aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_EFFECTIVE_DATE, null, 'onorbefore', dBTeffectiveDate));
    aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_REVENUE_END_DATE, null, 'onorafter', dBTeffectiveDate));

    return aSearchFilters;

}
// Find Matching for IBC
function ibcCriteria(idrrm, salesOrderCompare) {

    var aSearchFilters = new Array();
    // RRM was found now checking criteria.
    aSearchFilters.push(new nlobjSearchFilter('internalid', null, 'is', idrrm));

    if (salesOrderCompare.getFieldValue(FLD_MALE) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_MALE, null, 'is', salesOrderCompare.getFieldValue(FLD_MALE)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_NODE_NEGATIVE) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_NODENEGATIVE, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_NODE_NEGATIVE)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_NODE_POS_1_3) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_NODEPOSITIVE_1_3, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_NODE_POS_1_3)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_NODE_POS_4) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_NODEPOSITIVE_4, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_NODE_POS_4)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_MICORMETS) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_MICROMETS, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_MICORMETS)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_UNCERTAIN) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_NODEUNCERTAIN, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_UNCERTAIN)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_HER2_POS) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_HER2POSITIVE, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_HER2_POS)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_ER_NEG) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_ERNEGATIVE, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_ER_NEG)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_NON_MED_ONC_ODERS) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_NOMEDONCORDERS, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_NON_MED_ONC_ODERS)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_IBC_MULTI_TUMOR) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_MULITTUMOR, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_IBC_MULTI_TUMOR)));
    }
    return aSearchFilters;
}

// Find matching for Type Colon
function colonCriteria(idrrm, salesOrderCompare) {

    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('internalid', null, 'is', idrrm));
    if (salesOrderCompare.getFieldValue(FLD_SO_COLON_STAGE_2) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_COLON_STAGE2, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_COLON_STAGE_2)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_COLON_STAGE3AB) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_COLON_STAGE3, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_COLON_STAGE3AB)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_COLON_STAGE3C) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_COLON_STAGE3C, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_COLON_STAGE3C)));
    }
    return aSearchFilters;
}

// Find matching for Type Prostate
function prostateCriteria(idrrm, salesOrderCompare) {

    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('internalid', null, 'is', idrrm));

    if (salesOrderCompare.getFieldValue(FLD_SO_PROSTATE_AOBLESS6MTHS) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_BIOPSYLESSTHAN_6, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_PROSTATE_AOBLESS6MTHS)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_PROSTATE_AOB_6_36) == 'T') {
        aSearchFilters
                .push(new nlobjSearchFilter(FLD_RRM_BIOPSY636, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_PROSTATE_AOB_6_36)));
    }

    if (salesOrderCompare.getFieldValue(FLD_SO_GLEASON3PLUS4) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_GLEASON34, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_GLEASON3PLUS4)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_GLEASON4PLUS3) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_GLEASEON43, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_GLEASON4PLUS3)));
    }
    if (salesOrderCompare.getFieldValue(FLD_SO_GLEASON4PLUS3_GREATER) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_GLEASONOVER4, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_GLEASON4PLUS3_GREATER)));
    }

    return aSearchFilters;
}

// Find matching for Type Prostate
function DCISCriteria(idrrm, salesOrderCompare) {

    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('internalid', null, 'is', idrrm));
    if (salesOrderCompare.getFieldValue(FLD_SO_ICDS) == 'T') {
        aSearchFilters.push(new nlobjSearchFilter(FLD_RRM_DCIS, null, 'is', salesOrderCompare.getFieldValue(FLD_SO_ICDS)));
    }
    return aSearchFilters;
}

function adjustmeCategory(adjCat) {

    switch (adjCat) {
        case 'GH09': processGHIRefund(); break;
        default: process_adjustment();
    }
}

function noRRM() {

    var context = nlapiGetContext();
    var ACT_ALLOWANCE_DA = context.getSetting('SCRIPT', 'custscript_ghi_allowance_disc');
    var ACT_DISCOUNTS_ALLOWANCES = context.getSetting('SCRIPT', 'custscript_ghi_discounts_allowances');
    var idProduct = nlapiGetFieldValue(FLD_PRODUCT);
    var idCurrency = nlapiGetFieldValue(FLD_CURRENCY);
    var idPayer = nlapiGetFieldValue(FLD_PAYER);
    var dEffectiveDate = nlapiGetFieldValue(FLD_EFFECTIVEDATE);
    var subId = nlapiLookupField('customer', idPayer, 'subsidiary');
    var FlD_OLI_Value = nlapiGetFieldValue(FLD_OLI);
    var paymentAmount = parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT));
    var btId = nlapiGetRecordId();

    // Create the invoice
    var recInvoice = nlapiCreateRecord('invoice');
    recInvoice.setFieldValue('entity', idPayer);
    recInvoice.setFieldValue('custbody_ghi_billing_trans', btId);
    recInvoice.setFieldValue('trandate', dEffectiveDate);
    recInvoice.setFieldValue('currency', idCurrency);
    recInvoice.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
    recInvoice.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));

    var nLines = 0;
    recInvoice.selectNewLineItem('item');
    recInvoice.setCurrentLineItemValue('item', 'item', parseInt(nlapiGetFieldValue(FLD_PRODUCT)));
    recInvoice.setCurrentLineItemValue('item', 'price', '-1');
    recInvoice.setCurrentLineItemValue('item', 'rate', paymentAmount);
    recInvoice.setCurrentLineItemValue('item', 'custcol_contract_rate', paymentAmount);

    recInvoice.commitLineItem('item');
    nLines++;

    if (nLines > 0) {
        try {
            var idInvoice = nlapiSubmitRecord(recInvoice);
            nlapiSetFieldValue('custrecord_bt_related_ns_transaction', idInvoice);
        } catch (e) {
            nlapiSetFieldValue('custrecord_transaction_with_error', e.message);
            return;
        }
    }

    if (parseFloat(nlapiGetFieldValue(FLD_PAYMENTAMOUNT > 0))) {
        // Now create the Fully Reserved JE
        var recJE = nlapiCreateRecord('journalentry');
        recJE.setFieldValue('custbody_source_sales_invoice', idInvoice);
        recJE.setFieldValue('subsidiary', subId);
        recJE.setFieldValue('currency', idCurrency);
        recJE.setFieldValue(FLD_TRANS_OLI, FlD_OLI_Value);
        recJE.setFieldValue(FLD_TRANS_CLAIM, nlapiGetFieldValue(FLD_QUADAX_TICKET_ID));

        // debit line 2 acct 1215
        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_ALLOWANCE_DA);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(paymentAmount)));
        recJE.commitLineItem('line');

        // debit line 4350

        // credit line
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'custcol_oli', FlD_OLI_Value);
        recJE.setCurrentLineItemValue('line', 'custcol_bt', btId);
        recJE.setCurrentLineItemValue('line', 'custcol_associated_transaction', idInvoice);
        recJE.setCurrentLineItemValue('line', 'account', ACT_DISCOUNTS_ALLOWANCES);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(paymentAmount)));
        recJE.commitLineItem('line');
        Fi
        try {
            var idJE = nlapiSubmitRecord(recJE);
        } catch (e) {
            var eMessage = e;
            nlapiSetFieldValue("custrecord_transaction_with_error", eMessage);
        }
    }

    if (idJE != null && idJE != '' && idInvoice != null && idInvoice != '') {
        nlapiSetFieldValue('custrecord_created_ns_je', idJE);
        nlapiSubmitField('invoice', idInvoice, 'custbody_allowance_journal_entry', idJE);
    }
}
///script to close the sales order
//deploy to invoice after submit

//rfulling 8-29-2015

function closeSalesOrder(salesId) {
    var context = nlapiGetContext();
    nlapiLogExecution('Debug', 'ExecutionContext  ' + context.getExecutionContext());
    //Open the related sales order
    var invSalesOrder = salesId;//nlapiGetFieldValue('custbody_ghi_original_sales_order');
    var clSO = nlapiLoadRecord('salesorder', invSalesOrder);
    var lineCount = clSO.getLineItemCount('item');
    for (var i = 0; i < lineCount; i++) {
        clSO.setLineItemValue('item', 'isclosed', i + 1, 'T');
    }
    nlapiSubmitRecord(clSO);
}