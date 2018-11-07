var soc = nlapiLoadRecord('salesorder', 7709);
var bt = nlapiLoadRecord('customrecord_billing_transaction', 2402);
var myDate1 = new Date(soc.getDateTimeValue('createddate', 'America/Los_Angeles'));


//myDate = nlapiDateTimeToString(new Date(),'date');
//myDate = soc.getDateTimeValue('createddate', 'America/Los_Angeles');
myDate1 = nlapiDateToString(myDate1);
bt.setFieldValue('custrecord_bt_effective_date', myDate1);
//myDate = nlapiDateToString(nlapiDateToString(myDate),'date');
//nlapiSubmitRecord(bt);
var stop = '';