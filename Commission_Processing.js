//run the search to get the employee commission rate
//For each employee determine the total sales and total COGS by calling the summary report on the employee id.
//return all employees with a commission rate attached
var arrCommissions = employeeCommission();
//First go through and summarize the commissions with rates and cogs into a custom record



//loop through each line here and get the total commission by employee and calculate the new rate.
for (var i = 0; i < arrCommissions.length; i++) {
    //Here get the summary for employee id
    arrEmpFilter = [];
    arrEmpCol = [];
  

    var salesRep = arrCommissions[i].getValue('salesrep', 'customer', 'group');
    var commRate = arrCommissions[i].getValue('custcol_lcb_item_comm_rate', null, 'group');
    var repRate = arrCommissions[i].getValue('custcol_lcb_item_comm_rate', null, 'group');
    //var columns = arrCommissions[i].getAllColumns();
    var sales = arrCommissions[i].getValue('amount', null, 'sum');
    var cogs = arrCommissions[i].getValue('costestimate', null, 'sum');
    var grossProfit = parseInt(sales) - parseInt(cogs);
    var gpForRate = (parseFloat(sales) - parseFloat(cogs)) / parseFloat(sales);
    var newCompRate = 0;
    

    //here if the profit is less than 41% then you should calc a new rate
    //insert all the rates into a new custom record for further processing.
    if (gpForRate < .41) {
        var newCompRate = ((parseFloat(grossProfit)) / (parseFloat(sales)) * parseFloat(repRate));
    }
    var newComp = nlapiCreateRecord('customrecord_lbc_commission');
    newComp.setFieldValue('custrecord_lbc_commission_emp', salesRep);
    newComp.setFieldValue('custrecord_lbc_original_comp_rate', repRate);
    newComp.setFieldValue('custrecord_lbc_new_comp_rate', newCompRate);
    newComp.setFieldValue('custrecord_lbc_rate_accounting_period', 80);
    newComp.setFieldValue('custrecord_lbc_commission_sales', sales);
    newComp.setFieldValue('custrecord_lbc_total_gross_profit', grossProfit);
    newComp.setFieldValue('custrecord_lbc_total_cogs', cogs);
    nlapiSubmitRecord(newComp);


    // now send these variables to the routin to calcualte the effective rate.
   // if (gpForRate < .41) {
        //calculate a new composit rate for this line. as total (GP / total Sales)/.41 * original rate. 
       // reCalcComm(salesRep, repRate);
    //}
}



function employeeCommission() {
    var arrFilters = [];
    var aSearchColumns = [];
    aSearchColumns.push(new nlobjSearchColumn('amount', null, 'sum'));
    aSearchColumns.push(new nlobjSearchColumn('costestimate', null, 'sum'));
    aSearchColumns.push(new nlobjSearchColumn('salesrep', 'customer', 'group'));
    aSearchColumns.push(new nlobjSearchColumn('custcol_lcb_item_comm_rate', null, 'group'));

    var arrCommRates = nlapiSearchRecord('transaction', 'customsearch_lbc_sales_summary_by_rep_4', arrFilters, aSearchColumns);

    if (arrCommRates) {
        nlapiLogExecution('DEBUG', 'Nothing fouund' + ': ' + 'length' + " : " + arrCommRates.length);
        return arrCommRates;
    } else {
        return false;
    }

}

function reCalcComm(empId, repRate) {
    var arrFilters = [];
    var aSearchColumns = [];


    arrFilters.push(new nlobjSearchFilter('salesrep', 'customer', 'is', empId));
    arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', false));
    arrFilters.push(new nlobjSearchFilter('salesrep', null, 'noneof', 'unassigned'));
    arrFilters.push(new nlobjSearchFilter('accounttype', null, 'is', ['COGS', 'Income']));
    arrFilters.push(new nlobjSearchFilter('custcol_lcb_item_comm_rate', null, 'isnotempty', null));

    //customsearch_lbc_sales_by_rep
    var arrCustLic = nlapiSearchRecord('transaction', 'customsearch_lbc_sales_summary_by_rep', arrFilters, aSearchColumns);

    if (arrCustLic) {
        for (var i = 0; i < arrCustLic.length; i++) {
            var columnLen = columns.length;
            var totSales = 0;
            var totGP = 0;
            var totalCogs = 0;
            var totMargin = 0;
            for (x = 0; x < columnLen; x++) {
                var column = columns[x];
                var label = column.getLabel();
                if (label == "Sales") {
                    totSales = arrCustLic[i].getValue(column);
                }
                if (label == "GP") {
                    totGP = arrCustLic[i].getValue(column);
                }
                if (label == "COGS") {
                    totalCogs = arrCustLic[i].getValue(column);
                }
            }
        }
        var newCompRate = ((parseFloat(totGP)) / (parseFloat(totSales)) * parseFloat(repRate));
        var newComp = nlapiCreateRecord('customrecord_lbc_commission');
        newComp.setFieldValue('custrecord_lbc_commission_emp', empId);
        newComp.setFieldValue('custrecord_lbc_original_comp_rate', repRate);
        newComp.setFieldValue('custrecord_lbc_new_comp_rate', newCompRate);
        newComp.setFieldValue('custrecord_lbc_rate_accounting_period', 80);
        newComp.setFieldValue('custrecord_lbc_commission_sales', totSales);
        newComp.setFieldValue('custrecord_lbc_total_gross_profit', totGP);
        newComp.setFieldValue('custrecord_lbc_total_cogs', totalCogs);
        nlapiSubmitRecord(newComp);

        var stop = '';
    } else {
        return false;
    }

}



//reCalcCommManual(793, parseFloat(.09), parseFloat(375.00), parseFloat(300.00));

function reCalcCommManual(empId, repRate, sales, cogs) {
    var arrFilters = [];
    var aSearchColumns = [];
    arrFilters.push(new nlobjSearchFilter('salesrep', 'customer', 'is', empId));
    arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', false));
    arrFilters.push(new nlobjSearchFilter('salesrep', null, 'noneof', 'unassigned'));
    arrFilters.push(new nlobjSearchFilter('accounttype', null, 'is', ['COGS', 'Income']));
    arrFilters.push(new nlobjSearchFilter('custcol_lcb_item_comm_rate', null, 'isnotempty', null));

    var gp = parseFloat(sales) - parseFloat(cogs);
    var gpSales = gp / parseInt(sales);
    var newRateCalc = (repRate / .04) * gpSales;
    var newComposite = nlapiFormatPercent(newRateCalc * repRate);



    var arrCustLic = nlapiSearchRecord('transaction', 'customsearch_lbc_sales_by_rep', arrFilters, aSearchColumns);

    if (arrCustLic) {
        for (var i = 0; i < arrCustLic.length; i++) {
            var columnLen = columns.length;
            var totSales = 0;
            var totGP = 0;
            var totalCogs = 0;
            var totMargin = 0;
            for (x = 0; x < columnLen; x++) {
                var column = columns[x];
                var label = column.getLabel();
                if (label == "Sales") {
                    totSales = arrCustLic[i].getValue(column);

                }
                if (label == "GP") {
                    totGP = arrCustLic[i].getValue(column);
                }
                if (label == "COGS") {
                    totalCogs = arrCustLic[i].getValue(column);
                }
            }
        }
        if (!isEmpty(repRate) && !isEmpty(newCompRate) ) {
            var newCompRate = ((parseFloat(totGP)) / (parseFloat(totSales)) * parseFloat(repRate));
            var newComp = nlapiCreateRecord('customrecord_lbc_commission');
            newComp.setFieldValue('custrecord_lbc_commission_emp', empId);
            newComp.setFieldValue('custrecord_lbc_original_comp_rate', repRate);
            newComp.setFieldValue('custrecord_lbc_new_comp_rate', newCompRate);
            newComp.setFieldValue('custrecord_lbc_rate_accounting_period', 80);
            newComp.setFieldValue('custrecord_lbc_commission_sales', totSales);
            newComp.setFieldValue('custrecord_lbc_total_gross_profit', totGP);
            newComp.setFieldValue('custrecord_lbc_total_cogs', totalCogs);
            nlapiSubmitRecord(newComp);
        }
        var stop = '';
    } else {
        return false;
    }

}

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

