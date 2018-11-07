
File
cs_Check_Print_Preference.js
Save
Cancel
CONTENT

/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       06 Nov 2015     pkapse
 *
 */

var PRINT_TYPE_TRUE = '1';
var PRINT_TYPE_FALSE = '2';
var COMMENTS_FALSE = '3';



function onsave_checkEstimatePrintType(type) {
    var stCheckPrint = '';
    try {
        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Script Started...');

        stCheckPrint = checkPrintType();
        //		alert("stCheckPrint: "+ stCheckPrint);

        if (stCheckPrint == PRINT_TYPE_FALSE) {

            alert('Please select an Estimate with same PRINTING PREFERENCE');
            return false;

        } else if (stCheckPrint == COMMENTS_FALSE) {
            alert("Please select one Default LTC");
            return false;
        } else if (stCheckPrint == PRINT_TYPE_TRUE) {
            return true;
        }



        nlapiLogExecution('DEBUG', 'ACTIVITY', 'Script Ended Sucessfully');
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

function checkPrintType() {
    var logTitle = ' checkPrintType ';

    nlapiLogExecution('DEBUG', 'ACTIVITY', 'checkPrintType Started...');
    var isPrintType = '';
    var arrPrintType = [];
    var stPrintType = '';
    var countDefaultComments = 0;

    var intLineCount = nlapiGetLineItemCount('custpage_estimate_sublist');
    //	alert("intLineCount: " + intLineCount);

    for (var x = 1; x <= intLineCount; x++) {

        var bProcess = nlapiGetLineItemValue('custpage_estimate_sublist', 'custpage_select', x);

        if (bProcess == 'T') {
            stPrintType = (nlapiGetLineItemValue('custpage_estimate_sublist', 'custpage_print_pref_sublist', x) == null) ? "" :
                                       nlapiGetLineItemValue('custpage_estimate_sublist', 'custpage_print_pref_sublist', x);

            //			alert("stPrintType : "+ stPrintType);

            stDefaultComments = (nlapiGetLineItemValue('custpage_estimate_sublist', 'custpage_disclaimer_select', x) == null) ? "" :
                                       nlapiGetLineItemValue('custpage_estimate_sublist', 'custpage_disclaimer_select', x);

            //			alert("stDefaultComments : "+ stDefaultComments);

            nlapiLogExecution('DEBUG', logTitle, 'stPrintType: ' + stPrintType);
            nlapiLogExecution('DEBUG', logTitle, 'stDefaultComments: ' + stDefaultComments);
            arrPrintType.push(stPrintType);

            if (stDefaultComments == 'T') {
                countDefaultComments++;
                //   				alert("countDefaultComments: " + countDefaultComments);

            }



        }


    }

    if (arrPrintType.length == '1') {
        isPrintType = 'T';
    }
    else {
        for (var i = 0; i < arrPrintType.length ; i++) {                        // outer loop uses each item i at 0 through n
            for (var j = i + 1; j < arrPrintType.length ; j++) {              // inner loop only compares items j at i+1 to n

                //				alert("for loop i : " + i + ": j : " + j );
                //				alert( "arrPrintType[i] : " + arrPrintType[i] + "\nisPrintType: " + isPrintType);

                if (arrPrintType[i] == arrPrintType[j]) {

                    isPrintType = 'T';

                }
                else {

                    isPrintType = 'F';

                }
            }
        }
    }
    //	alert("countDefaultComments: " + countDefaultComments);
    if (countDefaultComments < '1') {
        //		alert("Please select one Default LTC");
        return COMMENTS_FALSE;
    } else if (countDefaultComments > '1') {
        //		alert("Please select only one Default LTC");
        return COMMENTS_FALSE;
    }

    //	alert("isPrintType: " + isPrintType);


    if (isPrintType == 'T') {
        return PRINT_TYPE_TRUE;
    }
    else {
        return PRINT_TYPE_FALSE;
    }

}
Save
Cancel
