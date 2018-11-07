


function invEmailWithFilesSample_ue_afterSubmit(type) {

    //send the Email with the Attached Files when the Invoiced is Saved when first created
    if (type == 'create') {

        //array used to store the Files to be attached
        var attachments = new Array();

        //looping through the Items on Invoice record > Items tab > Billable Expenses subtab:

        var i = 1;
        while (i <= nlapiGetLineItemCount('expcost')) {

            //the Internal Id of the Expense Report associated with this line:
            var expRepRecInternalID = nlapiGetLineItemValue('expcost', 'doc', i);

            //the Line Number on the Expense Report associated with this line:
            var expRepLine = nlapiGetLineItemValue('expcost', 'line', i);

            //load the Expense Report record associated with this line:
            var expRepRec = nlapiLoadRecord('expensereport', expRepRecInternalID);

            //get the Internal ID of the File specified in 'Attach File' for this line from the Expense Report:
            var attachFileInternalID = expRepRec.getLineItemValue('expense', 'expmediaitem', expRepLine);

            //add the File Object to the attachments array
            attachments.push(nlapiLoadFile(attachFileInternalID));

            i++;
        }

        //specify the transaction record (Invoice) that the Email should be associated with
        var record = new Array();
        record['transaction'] = nlapiGetRecordId();

        //send Email with the Files included as attachments from the Current User to the Email specified in the "To Be Emailed" field
        nlapiSendEmail(nlapiGetUser(), nlapiGetFieldValue('email'), 'test subject', 'test body', null, null, record, attachments);
    }
}
