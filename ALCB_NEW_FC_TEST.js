/**
* Copyright (c) 1998-2013 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
*
* This software is the confidential and proprietary information of
* NetSuite, Inc. ("Confidential Information"). You shall not
* disclose such Confidential Information and shall use it only in
* accordance with the terms of the license agreement you entered into
* with NetSuite.
*
* @author jsalcedo
*/

var HAS_SURCHARGE = '';
var MIN_SURCHARGE = '';
var MAX_SURCHARGE = '';
var SURCHARGE_PCT = '';
var SURCHARGE_FLAT = '';
var fuelCharge = {};
var context = nlapiGetContext();

function onPageInit(type, name, linenum) {
    nlapiLogExecution('Debug', 'name on Init  ' + name);
    var context = nlapiGetContext();
    if (type == 'create') {
        getCharges(type, name);
    }

    nlapiLogExecution('Debug', 'ExecutionContext  ' + context.getExecutionContext());
    nlapiLogExecution('Debug', 'Record  ' + nlapiGetRecordType());
    var stExciseCharge = context.getSetting('SCRIPT', 'custscript_lbc_excise_line_item');
    var stMunicipalityCharge = context.getSetting('SCRIPT', 'custscript_lbc_municipality_tax_charge');
    var stCommonwealthCharge = context.getSetting('SCRIPT', 'custscript_lbc_common_tax_line_item');
    var stFuelCharge = context.getSetting('SCRIPT', 'custscript_lbc_fuel_line_item');
    //nlapiFormatCurrency

    //if editing we need to recalcualte the fuel charge.
    if (type == 'edit' && context.getExecutionContext() == 'userinterface') {
        fieldChanged_fuelSurcharge(type);
        //delete the other charges if editing an invoice
        if (nlapiGetRecordType() == 'invoice') {
            var intLineCount = nlapiGetLineItemCount('item');
            //if the line item is any of the fuel charge excise tax, muni tax or commonwealth remove the lines
            for (var intLineCtr = 1; intLineCtr <= intLineCount; intLineCtr++) {
                var stItem = nlapiGetLineItemValue('item', 'item', intLineCtr);
                if (stItem == stExciseCharge || stItem == stMunicipalityCharge || stItem == stCommonwealthCharge || stItem == stFuelCharge) {
                    nlapiRemoveLineItem('item', intLineCtr);
                }
            }
            var calInvoiceTotal = forceParseFloat(nlapiGetFieldValue("custbody_invoice_total"));//+ forceParseFloat(nlapiGetFieldValue("taxtotal")));
            //  updateAMTtocollect((forceParseFloat(calInvoiceTotal)), 0.00, nlapiGetFieldValue("custbody_lbc_inv_cod_limit"));
        }
    }
}

//Runs on field Changed 
function fieldChanged_fuelSurcharge(type, name, linenum) {
   
    if (name == 'entity') {
        nlapiLogExecution('Debug', 'Name for get Charges ' + name);
        nlapiLogExecution('Debug', 'TYPE for get Charges ' + type);
        getCharges(type,name);
    }
    if (name == 'custbody_lcb_fuel_surcharge_used') {
        toggleBoxChange();
    }
    if (name == "custbody_lcb_amount_to_collect") {
        amtToCollectChange();
    }
    // nlapiLogExecution('Debug', 'Line1 : ' + type +name);
/*
    var context = nlapiGetContext();
    nlapiLogExecution('Debug', 'ExecutionContext Field Changed  ' + context.getExecutionContext());
    
    if (context.getExecutionContext() == 'userinterface') {
        var fuelCharge = new Array();
        var stDiscountItemtoUse = context.getSetting('SCRIPT', 'custscript_lcb_default_fuel_charge');
        
        //if the field changed in custbody_lcb_fuel_surcharge_amt then get the amount and add it to the total
        if (name == "custbody_lcb_fuel_surcharge_amt") {
            var excise = forceParseFloat(nlapiGetFieldValue('custbody_excise_tax'));
            var muni = forceParseFloat(nlapiGetFieldValue('custbody_municipality_tax'));
            var comonT = forceParseFloat(nlapiGetFieldValue('custbody_commonwealth_tax'));
            var temTotal = forceParseFloat(nlapiGetFieldValue('total'))
            var manualFuel = forceParseFloat(nlapiGetFieldValue("custbody_lcb_fuel_surcharge_amt"));
            var totalCharges = temTotal + manualFuel + comonT + muni + excise;
            nlapiSetFieldValue('custbody_invoice_total', nlapiFormatCurrency(temTotal + manualFuel + comonT + muni + excise));

        }
    }
    */
}

function toggleBoxChange(){

            if (nlapiGetFieldValue('custbody_lcb_fuel_surcharge_used') == 'F') {
                nlapiLogExecution('Debug', 'Toggle the fuel box  ' + nlapiGetFieldValue('custbody_lcb_fuel_surcharge_used'));
                var custLim = nlapiGetFieldValue('custbody_lbc_inv_cod_limit');
                var excise = forceParseFloat(nlapiGetFieldValue('custbody_excise_tax'));
                var muni = forceParseFloat(nlapiGetFieldValue('custbody_municipality_tax'));
                var comonT = forceParseFloat(nlapiGetFieldValue('custbody_commonwealth_tax'));
                var caltaxtotal = forceParseFloat(nlapiGetFieldValue('taxtotal'));
                nlapiSetFieldValue('discountrate', (0.00), false);
                nlapiSetFieldValue('custbody_lcb_fuel_surcharge_amt', (0.00), false);
                var invTotal = caltaxtotal + forceParseFloat(excise) + forceParseFloat(muni) + forceParseFloat(comonT) + forceParseFloat(nlapiGetFieldValue('subtotal')) + forceParseFloat(nlapiGetFieldValue("custbody_lcb_fuel_surcharge_amt"));
                nlapiSetFieldValue('custbody_invoice_total', nlapiFormatCurrency(invTotal));
                updateAMTtocollect(invTotal, 0, custLim);
                // var amtToCollect = recalc_fuelSurcharge(invTotal, custLim);
                //nlapiSetFieldValue('custbody_lcb_amount_to_collect', invTotal);

            } else {
                recalc_fuelSurcharge();
            }
        
}

function amtToCollectChange() {
   
        var calInvoiceTotal = forceParseFloat(nlapiGetFieldValue("custbody_invoice_total"));//+ forceParseFloat(nlapiGetFieldValue("taxtotal")));
        nlapiLogExecution('Debug', 'name =   ' + name);
        var minToCollect = forceParseFloat(calInvoiceTotal) * forceParseFloat(1.5);
        nlapiLogExecution('Debug', 'Amount to Collect=  ' + forceParseFloat(nlapiGetFieldValue('custbody_lcb_amount_to_collect')));
        nlapiLogExecution('Debug', 'InvTotal * 1.5 =  ' + forceParseFloat(calInvoiceTotal * (1.5)));

        if (nlapiFormatCurrency(forceParseFloat(nlapiGetFieldValue("custbody_lcb_amount_to_collect"))) < (forceParseFloat(calInvoiceTotal * forceParseFloat((1.5))))) {
            // updateAMTtocollect((forceParseFloat(calInvoiceTotal)), 0.00, nlapiGetFieldValue("custbody_lbc_inv_cod_limit"));
            alert("Check must be at Least:  " + nlapiFormatCurrency(forceParseFloat(calInvoiceTotal * (1.5))));
            recalc_fuelSurcharge();
        }
  }

function getCharges(type,name) {
    nlapiLogExecution('Debug', 'getting charges name ' + name);

    nlapiLogExecution('Debug', 'getting charges type ' + type);
    var stLogTitle = "fieldChanged_fuelSurcharge";
           var arr_logs = [];
           arr_logs.push('Script Starts ' + stLogTitle);
            try {
                //arr_logs.push('name =' + name);
                var calcFuelCharge = nlapiGetFieldValue('custbody_lcb_fuel_surcharge_used');
                //if ((name == 'entity' || type == 'edit') && context.getExecutionContext() == 'userinterface') {
                if ( context.getExecutionContext() == 'userinterface') {
                    //arr_logs.push('name =' + name);
                    nlapiLogExecution('DEBUG', 'State  : ' + "myState " + type);
                    var customer_class = nlapiGetFieldValue('class');
                    var customer_state = nlapiGetFieldValue('shipstate');

                    nlapiLogExecution('Debug', 'afterSetVal is  ', 'Customer State' + customer_state);
                    nlapiLogExecution('Debug', 'afterSetVal is  ', 'Customer Class' + customer_class);

                    var has_result = false;
                    nlapiLogExecution('Debug', 'before search  ', 'HasResult' + has_result);
                    //has class and state
                    if (!isEmpty(customer_class) && !isEmpty(customer_state)) {

                        var surcharge_filters = [];
                        //RF filter fo state does not work
                        //surcharge_filters.push(new nlobjSearchFilter('custrecord_lcb_fuel_surcharge_state', null, 'anyof', customer_state));
                        surcharge_filters.push(new nlobjSearchFilter('custrecord_lcb_fuel_charge_class', null, 'anyof', customer_class));

                        var surcharge_columns = [];
                        surcharge_columns.push(new nlobjSearchColumn('custrecord_lcb_fuel_surcharge_state'));
                        surcharge_columns.push(new nlobjSearchColumn('internalid'));

                        //State filter does not work so loop through results to see if a state is found
                        var arrResult = nlapiSearchRecord('customrecord_lcb_fuel_surcharge_control', null, surcharge_filters, surcharge_columns);

                        if (arrResult) {
                            for (var x = 0; x < arrResult.length; x++) {
                                if (customer_state == arrResult[x].getText('custrecord_lcb_fuel_surcharge_state'))
                                    fuelCharge[0] = arrResult[x].getValue('internalid');
                            }

                            if (fuelCharge[0].length > 0) {
                                has_result = true;
                            }
                            else {
                                arr_logs.push('No results found for class and state');
                            }
                        }
                        nlapiLogExecution('Debug', 'Results for state AND class  ', '= ' + fuelCharge[0]);
                    }

                    if (has_result) {
                        nlapiLogExecution('Debug', 'has Result processing charge ', parseInt(fuelCharge[0]), ': ' + name);
                        //if this is an edit do not rcalc theupdate the flac
                        //No that we have a result and the want to writ a new query that gets the correct line by internalid.
                        var surcharge_rec = nlapiLoadRecord('customrecord_lcb_fuel_surcharge_control', parseInt(fuelCharge[0]));
                        //var surcharge_rec = surcharge_search[0];
                        var surcharge_percent = surcharge_rec.getFieldValue('custrecord_lcb_fuel_surcharge_percent');
                        var surcharge_flat = surcharge_rec.getFieldValue('custrecord_lcb_fuel_surcharg_flat');
                        var surcharge_min = surcharge_rec.getFieldValue('custrecord_lcb_fuel_surcharge_min');
                        var surcharge_max = surcharge_rec.getFieldValue('custrecord_lcb_fuel_surcharg_max');
                        var surcharge_if_use = nlapiGetFieldValue('custbody_lcb_fuel_surcharge_used')
                        //let us use the pagehere no the rec

                        if (type != 'edit') {
                            surcharge_if_use = surcharge_rec.getFieldValue('custrecord_lcb_use_surcharge');
                        }

                        nlapiLogExecution('Debug', 'Processed processing charge ', surcharge_if_use, ': ' + name);

                        //set fields
                        nlapiLogExecution('DEBUG', 'SetFlat on Create ', 'apply on create ' + ': ' + surcharge_flat);
                        nlapiSetFieldValue('custbodylcb_fuel_pct', surcharge_percent, false);

                        if (!isEmpty(surcharge_flat)) {
                            nlapiSetFieldValue('custbody_lcb_fuel_surcharge_flat', surcharge_flat, false);
                        }
                        nlapiSetFieldValue('custbody_lcb_fuel_surcharge_used', surcharge_if_use, false);

                        // nlapiLogExecution('Debug', 'Setting the Min Surharge  ', surcharge_min, ': ', +'is it so');
                        MIN_SURCHARGE = surcharge_min;
                        MAX_SURCHARGE = surcharge_max;
                        SURCHARGE_PCT = surcharge_percent;
                        SURCHARGE_FLAT = surcharge_flat;

                        nlapiLogExecution('DEBUG', 'Has Surcharge and  ', 'apply on create ' + ': ' + surcharge_if_use);

                        if (surcharge_if_use == 'T') {
                            HAS_SURCHARGE = true;
                            //run recalc on edit if
                            if (type == 'edit') {
                                recalc_fuelSurcharge(type);
                            }
                        }
                        else {
                            HAS_SURCHARGE = false;
                        }

                    }
                    else {

                        //If you don't find one then a fuel surcharge is NOT allowed on that customer
                        //set to null
                        //nlapiSetFieldValue('custbodylcb_fuel_pct', surcharge_percent, false);
                        //nlapiSetFieldValue('custbody_lcb_fuel_surcharge_flat', surcharge_flat, false);
                        //nlapiSetFieldValue('custbody_lcb_fuel_surcharge_used', surcharge_if_use, false);
                        nlapiLogExecution('DEBUG', 'NoResults found for this  ', 'param acct ' + ': ' + name);
                    }
                }

            }
            catch (err) {
                arr_logs.push("[ERROR] " + err.message);
                nlapiLogExecution('DEBUG', 'failed togo ', err.message, ': ' + err.message);
            }
        }
    


//this runs on the add line and changes the fuel surcharge amount.
function recalc_fuelSurcharge(type, name) {
    if (type != "create") {
        nlapiLogExecution('DEBUG', 'Recalc  ', 'Name ' + ': ' + name);
        var total = forceParseFloat(nlapiGetFieldValue('subtotal'));
        var excise = forceParseFloat(nlapiGetFieldValue('custbody_excise_tax'));
        var muni = forceParseFloat(nlapiGetFieldValue('custbody_municipality_tax'));
        var comonT = forceParseFloat(nlapiGetFieldValue('custbody_commonwealth_tax'));
        var custLimit = nlapiGetFieldValue('custbody_lbc_inv_cod_limit');
        // var fuelC = forceParseFloat(nlapiGetFieldValue('custbody_lcb_fuel_surcharge_amt'));
        var context = nlapiGetContext();
        var stDiscountItemtoUse = context.getSetting('SCRIPT', 'custscript_lcb_default_fuel_charge');
        var invTotal = (total + excise + muni);
        var collectionTotal = invTotal + forceParseFloat(nlapiGetFieldValue('taxtotal'));
        var surcharge_if_use = nlapiGetFieldValue('custbody_lcb_fuel_surcharge_used');
        // addded to calculate the COGS on the line item

        //
        //  var itemCost =nlapiLookupField('item',nlapiGetCurrentLineItemValue('item','item'),'averagecost')
        //  nlapiSetLineItemValue('custcol_lbc_line_cogs',nlapiGetCurrentLineItemValue('item','quantiy')*itemCost);

        nlapiLogExecution('DEBUG', 'PagefieldValue  ', 'p ' + ': ' + surcharge_if_use);
        if (surcharge_if_use == 'T') {
            // if (HAS_SURCHARGE) {
            /*If using a percentage
                a.	If the percentage calculation exceeds the maximum charge the script will change the amount to the maximum
                b.	If the percentage calculation is below the minimum charge the script will change the amount to the minimum
            If using a flat rate, just use that – no other calculations are needed
            */
            nlapiLogExecution('DEBUG', 'PagefieldValue  ', 'apply this %' + ': ' + (total * forceParseFloat(SURCHARGE_PCT)) / 100);
            nlapiLogExecution('DEBUG', 'PagefieldValue  ', 'apply this Flat' + ': ' + (forceParseFloat(SURCHARGE_FLAT)));
            // nlapiSetFieldValue('discountitem', stDiscountItemtoUse);
            // nlapiLogExecution('DEBUG', 'Ssetting the rate  ', 'param acct ' + ': ' + stDiscountItemtoUse);

            var discountrate = 0;

            if (forceParseFloat(SURCHARGE_PCT) > 0) {
                nlapiLogExecution('DEBUG', 'What is my percent total ', 'apply this %' + ': ' + SURCHARGE_PCT);
                var discountedtotal = (total * forceParseFloat(SURCHARGE_PCT)) / 100;
                discountrate = discountedtotal;
                if (discountedtotal > MAX_SURCHARGE) {
                    discountrate = MAX_SURCHARGE;
                } else if (discountedtotal < MIN_SURCHARGE) {
                    discountrate = MIN_SURCHARGE;
                }
            }
            else {
                discountrate = SURCHARGE_FLAT;
            }

        }

    }
    updateAMTtocollect(collectionTotal, discountrate, custLimit);
}

function updateAMTtocollect(invTotal, discountrate, custLimit) {

    var context = nlapiGetContext();
    var ATC =0 ;
    if (context.getExecutionContext() == 'userinterface') {
        //nlapiLogExecution('DEBUG', 'Settotal Invoice   ', 'Invoice  '  + (forceParseFloat(invTotal)));
        nlapiLogExecution('DEBUG', 'Settotal Invoice   ', 'Fuel' + ' Fuel ' + (forceParseFloat(discountrate)));
        if (!isEmpty(discountrate)) {
            nlapiSetFieldValue('custbody_lcb_fuel_surcharge_amt', nlapiFormatCurrency(forceParseFloat(discountrate)), false);
            ATC=(forceParseFloat(invTotal)+forceParseFloat(discountrate));

            nlapiSetFieldValue('custbody_invoice_total', nlapiFormatCurrency(ATC), false);


        }
        var totalInvoice = (forceParseFloat(invTotal) + forceParseFloat(discountrate));
        //       nlapiSetFieldValue('custbody_lcb_amount_to_collect', parseFloat(500));
        nlapiLogExecution('Debug', 'Total Invoice  ', totalInvoice);

        if (nlapiGetFieldValue('custbody_lcb_trans_cpd') == 'T') {
            var amountDue = totalInvoice;
            nlapiLogExecution('Debug', 'Total Invoice  ', totalInvoice);

            if (custLimit >= 50000) {
                amountDue = 0;
            }
            else if (forceParseFloat(custLimit) == forceParseFloat(10000)) {

                amountDue = forceParseFloat(totalInvoice) + (forceParseFloat(totalInvoice) * .5);
            }
            else if (custLimit >= 1 && custLimit < 10000) {

                amountDue = forceParseFloat(totalInvoice) + forceParseFloat(custLimit);
            }
            else if (custLimit == 1) {
                amountDue = forceParseFloat(totalInvoice);
            }
            nlapiLogExecution('Debug', 'Return Amt Due ', amountDue);
            // var testTot = forceParseFloat(invAmt) + forceParseFloat(pastDue);
            nlapiSetFieldValue('custbody_lcb_amount_to_collect', parseFloat(amountDue), false, false);
            nlapiLogExecution('Debug', 'Amount Due ', amountDue);
        }
    }


}



//Library Files
function getAllResults(stRecordType, stSavedSearch, arrFilters, arrColumns) {
    var stLoggerTitle = 'getAllResults';

    var arrResults = [];

    var count = 1000;
    var init = true;
    var min = 0;
    var max = 1000;
    if (stSavedSearch) {
        var search = nlapiLoadSearch(stRecordType, stSavedSearch);
        if (arrFilters) search.addFilters(arrFilters);
        if (arrColumns) search.addColumns(arrColumns);
    }
    else {
        var search = nlapiCreateSearch(stRecordType, arrFilters, arrColumns);
    }

    var rs = search.runSearch();

    while (count == 1000 || init) {
        checkUsageLimit(stLoggerTitle);

        var resultSet = rs.getResults(min, max);
        arrResults = arrResults.concat(resultSet);
        min = max;
        max += 1000;

        init = false;
        count = resultSet.length;
    }

    return arrResults;
}


function inArray(val, arr) {
    var bIsValueFound = false;

    for (var i = 0; i < arr.length; i++) {
        if (val == arr[i]) {
            bIsValueFound = true;
            break;
        }
    }

    return bIsValueFound;
}


function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

function checkUsageLimit(stLoggerTitle) {
    var stLoggerTitle = 'checkUsageGovernance';

    var USAGE_LIMIT_THRESHOLD = 250;

    var intRemainingUsage = nlapiGetContext().getRemainingUsage();
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Remaining Usage = ' + intRemainingUsage);

    if (intRemainingUsage < USAGE_LIMIT_THRESHOLD) {
        var state = nlapiYieldScript();
        var reason = 'Reason: ' + state.reason + ' Info: ' + state.information + ' Size: ' + state.size;

        if (state.status == 'FAILURE') {
            nlapiLogExecution('ERROR', stLoggerTitle, 'Exit. Failed to yield script. ' + reason);
            throw nlapiCreateError('SCRIPT_ERROR', 'Exit. Failed to yield script. ' + reason);

        }
        else if (state.status == 'RESUME') {
            nlapiLogExecution('AUDIT', stLoggerTitle, 'Yield. Resuming script. ' + reason);
        }
    }
}

function forceParseFloat(stValue) {
    var flValue = parseFloat(stValue);

    if (isNaN(flValue) || (Infinity == stValue)) {
        return 0.00;
    }

    return flValue;
}