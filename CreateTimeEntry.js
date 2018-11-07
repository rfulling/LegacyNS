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
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       20 Jan 2015     jburgos         
 * 2.00       23 Mar 2015     jburgos          Modified the whole script
 */

var DEBUG = true;

var CONTEXT = nlapiGetContext();

function beforeSubmit_otherCharges(type) {
    //Here we will loop through the vendor bill to pick up the variables

}


Rtest(actTime, myDate)
function Rtest(actTime, myDate) {
    var ARR_DATE_GRID = [];
    var ARR_TIME_GRID =
    [
            'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    //create new Time sheet
    var myTS = nlapiCreateRecord('timebill');//, { recordmode: 'dynamic' });
    myTS.setFieldValue('employee', 187288);
    myTS.setFieldValue('customer', 187287);
    myTS.setFieldValue('item', 5);
    myTS.setFieldValue('hours', 8);
    myTS.setFieldValue('trandate', myDate);

    nlapiSubmitRecord(myTS);
}

/*
function Rtest(actTime, myDate) {
    var ARR_DATE_GRID = [];
    var ARR_TIME_GRID =
    [
            'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    var myTS = nlapiLoadRecord('timesheet', tsID, { recordmode: 'dynamic' });

    var intNumberLines = myTS.getLineItemCount('timegrid');
    //loop lines on the time entry
    for (var intLineCounter = 1; intLineCounter <= intNumberLines; intLineCounter++) {
        myTS.selectLineItem('timegrid', intLineCounter);

        //loop days of the week
        for (var intDayCounter = 0; intDayCounter < ARR_TIME_GRID.length; intDayCounter++) {
            var sublistSubrecord = myTS.editCurrentLineItemSubrecord('timegrid', ARR_TIME_GRID[intDayCounter]);
            //if the id's match from the time entry you can update the rev rec with the calculation.
            if ((sublistSubrecord) && sublistSubrecord.getId() == timeEntryId) {
                var empRD = (parseFloat(revRecValue) / parseFloat(harApprovedTime)) * parseFloat(actTime)
                //var empRD = (parseFloat(actTime) / parseFloat(harApprovedTime)) * parseFloat(revRecValue)
                sublistSubrecord.setFieldValue('custrecord_apco_labor_fee_distribution', nlapiFormatCurrency(empRD));
                sublistSubrecord.setFieldValue('custrecord_apco_discount_distr', nlapiFormatCurrency((parseFloat(empRD) * parseFloat(discPct))));
                sublistSubrecord.setFieldValue('custrecord_apco_rebate_distr', nlapiFormatCurrency((parseFloat(empRD) * parseFloat(rebateFee))));
                //sublistSubrecord.setFieldValue('memo', 'funny ha ha');
            }
            if (sublistSubrecord) {
                sublistSubrecord.commit();
            }
        }
        myTS.commitLineItem('timegrid');
    }
    nlapiSubmitRecord(myTS);
}
*/




var vb = nlapiLoadRecord('vendorbill', 53056);

var myItems = vb.getLineItemCount('item');

for (var i = 1; i < myItems; i++) {

    var tr = nlapiCreateRecord('timebill');

    tr.setFieldValue('employee', vb.getFieldValue('entity'));
    tr.setFieldValue('customer', vb.getLineItemValue('item', 'customer', i));
    //tr.setFieldValue('casetaskevent', vb.getLineItemValue('item','customer',i));
    tr.setFieldValue('rate', vb.getLineItemValue('item', 'rate', i));
    tr.setFieldValue('trandate', vb.getFieldValue('trandate'));
    tr.setFieldValue('hours', vb.getLineItemValue('item', 'quantity', i));
    tr.setFieldValue('item', vb.getLineItemValue('item', 'item', i));

    //description on the line item should also be transferred
    //WE will want a link to the time entry so record the line item on the 
    //vendor bill id on the time record
    //time record id on the vendor bill
    //endit the vendor bill 
}
nlapiSubmitRecord(tr);