/**
 * Copyright (c) 1998-2017 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 *
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 *
 */

/**
 * Module Description - Creation of T&M Journal Entries
 *
 * Version    	Date            	Author           	Remarks
 * 1.00       	06/12/2017    		rfulling 			Initial version.
 *
 * User even script to get data off the Parent Matrix item when a Child is updated.
 */
var CONTEXT = nlapiGetContext();
var ff_synchFlag = CONTEXT.getSetting('SCRIPT', 'custscript_dj_ff_flag_value');
var ls_synchFlag = CONTEXT.getSetting('SCRIPT', 'custscript_dj_ls_flag_value');
var mg_synchFlag = CONTEXT.getSetting('SCRIPT', 'custscript_dj_mg_flag_value');




function itemUpdate(type) {
    var parentId = nlapiGetFieldValue('parent');
    if (CONTEXT.getExecutionContext() == 'webservices') {
       return false ;
    }


    if (isEmpty(parentId) && type == 'edit') {

        updateParent();

    } else {
        updateChild(); 
    }

}


function updateChild(childMatrix) {
    //  var childItem = nlapiLoadRecord('inventoryitem',2116);

    var parentId = nlapiGetFieldValue('parent');

    if (!isEmpty(parentId)) {

        var parentFlags = [];

        parentFlags = nlapiLookupField('inventoryitem', parseInt(parentId), ['custitem_ls_sync_flag', 'custitem_mg_sync_flag', 'custitem_ff_item_sync_flag']);

        nlapiSetFieldValue('custitem_mg_sync_flag', parentFlags.custitem_mg_sync_flag);
        nlapiSetFieldValue('custitem_ls_sync_flag', parentFlags.custitem_ls_sync_flag);
        nlapiSetFieldValue('custitem_ff_item_sync_flag', parentFlags.custitem_ff_item_sync_flag);
    }
}

//if the item being update is a parent item then get all the children and perform the update.


function updateParent() {


    var myId = nlapiGetRecordId();

    var pFlag = [];
    //    pFlags = nlapiGetFieldValue(['custitem_mg_sync_flag', 'custitem_ls_sync_flag', 'custitem_ff_item_sync_flag']);
    //  var mgFlag = ff_synchFlag;   //nlapiGetFieldValue(mg_synchFlag);
    //  var lsFlag = ls_synchFlag;   // nlapiGetFieldValue(ls_synchFlag);
    //var fFlag = mg_synchFlag;   //nlapiGetFieldValue(ff_synchFlag);

    nlapiSetFieldValue('custitem_ls_sync_flag', ls_synchFlag);
    nlapiSetFieldValue('custitem_mg_sync_flag', mg_synchFlag);
    nlapiSetFieldValue('custitem_ff_item_sync_flag', ff_synchFlag);

    var arrFilters = [];

    arrFilters.push(new nlobjSearchFilter('parent', null, 'is', myId));
    var childrenItems = nlapiSearchRecord('item', 'customsearch_dj_get_matrix_items', arrFilters, null);
    if (childrenItems) {
        //loop throught the children and set the field Id's

        for (var intCtr = 0; intCtr < childrenItems.length; intCtr++) {
            var childId = childrenItems[intCtr].getId();
            nlapiSubmitField('inventoryitem', childId, ['custitem_mg_sync_flag', 'custitem_ls_sync_flag', 'custitem_ff_item_sync_flag'], [mg_synchFlag, ls_synchFlag, ff_synchFlag]);
        }
    }
}

    /**
     * Return true if value is null, empty string, or undefined
     * @param stValue
     * @returns {Boolean}
     */
    function isEmpty(stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
            return true;
        }
        return false;
    }