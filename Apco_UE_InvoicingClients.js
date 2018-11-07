/**
* Copyright (c) 1998-2016 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
* You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
* you entered into with NetSuite.
*/

/**
* Module Description
* - Populate the Discount/Markup field with Disbursement fee for T&M item 
* 
* Version    	Date            	Author           	Remarks
* 1.00       	March 16, 2016    	mjpascual			
* 
*/

var CONTEXT = nlapiGetContext();

/**
 * TDD1: When the invoice is saved and the project is �T&M�, then set the rate and check the print box.
 * TDD3: A script will be added to populate the Discount/Markup field with the Markup % item and the % value from the project record
 * 
 * @param stType
 * @returns {Boolean}
 */
function beforeSubmit_populateItemPctFields(stType) {
    try {
        var stLoggerTitle = 'beforeSubmit_populateTMFields';
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');

        //Scipt Parameter
        var stItemDiscount = CONTEXT.getSetting('SCRIPT', 'custscript_apco_item_disc');
        var stItemDisbursement = CONTEXT.getSetting('SCRIPT', 'custscript_apco_item_disb');
        var stItemMarkupPct = CONTEXT.getSetting('SCRIPT', 'custscript_apco_markup_pct');
        var stTMProjectType = CONTEXT.getSetting('SCRIPT', 'custscript_apco_project_type');

        // Throw error if any script parameter is empty
        if (Eval.isEmpty(stItemDiscount) || Eval.isEmpty(stItemDisbursement) || Eval.isEmpty(stItemMarkupPct) || Eval.isEmpty(stTMProjectType)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        nlapiLogExecution('DEBUG', stLoggerTitle, 'stItemDiscount = ' + stItemDiscount + ' | stItemDisbursement =' + stItemDisbursement + ' | stItemMarkupPct =' + stItemMarkupPct + ' | stTMProjectType =' + stTMProjectType);

        //Getters
        var stProjectId = nlapiGetFieldValue('job');
        if (Eval.isEmpty(stProjectId)) {
            return;
        }

        var objProjectVal = nlapiLookupField('job', stProjectId,
		[
				'custentity_apco_disbursement_fee_pct', 'custentity_apco_discount_pct', 'custentity_apco_markup_pct', 'jobtype'
		]);
        var stDisbPct = objProjectVal.custentity_apco_disbursement_fee_pct;
        var stDiscPct = objProjectVal.custentity_apco_discount_pct;
        var stMarkUpPct = objProjectVal.custentity_apco_markup_pct;
        var stJobType = objProjectVal.jobtype;

        nlapiLogExecution('DEBUG', stLoggerTitle, 'stDisbPct = ' + stDisbPct + ' | stDiscPct =' + stDiscPct + ' | stMarkUpPct =' + stMarkUpPct + ' | stJobType =' + stJobType);

        //Setters: TDD1
        if (stJobType == stTMProjectType) {
            if (!Eval.isEmpty(stDisbPct)) {
                nlapiSetFieldValue('timediscount', stItemDisbursement, false, false);
                nlapiSetFieldValue('timediscrate', stDisbPct, false, false);
                nlapiSetFieldValue('timediscprint', 'T');

                nlapiLogExecution('DEBUG', stLoggerTitle, 'timediscount = ' + stItemDisbursement + ' | timediscrate =' + stDisbPct);
            }
            else if (!Eval.isEmpty(stDiscPct)) {

                stDiscPct = (parseFloat(stDiscPct) * -1) + '%';
                nlapiSetFieldValue('timediscount', stItemDiscount, false, false);
                nlapiSetFieldValue('timediscrate', stDiscPct, false, false);
                nlapiSetFieldValue('timediscprint', 'T');

                nlapiLogExecution('DEBUG', stLoggerTitle, 'timediscount = ' + stItemDiscount + ' | timediscrate =' + stDiscPct);
            }
        }

        //Setters: TDD3
        nlapiSetFieldValue('itemcostdiscount', stItemMarkupPct, false, false);
        nlapiSetFieldValue('itemcostdiscrate', stMarkUpPct, false, false);
        nlapiSetFieldValue('itemcostdiscprint', 'T', false, false);

        nlapiSetFieldValue('expcostdiscount', stItemMarkupPct, false, false);
        nlapiSetFieldValue('expcostdiscrate', stMarkUpPct, false, false);
        nlapiSetFieldValue('expcostdiscprint', 'T', false, false);


        nlapiLogExecution('DEBUG', stLoggerTitle, 'Mark-ups...');


        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');

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
 * Utilities
 */
Eval =
{
    /**
	 * Evaluate if the given string is empty string, null or undefined.
	 * 
	 * @param {String} stValue - Any string value
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
};
