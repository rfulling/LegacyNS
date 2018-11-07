/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
require(['N/ui/serverWidget','N/record','N/render','N/search'],

function(serverWidget,record,render,search) {
    var customerId = 2485529;
    var startDate = '03/01/2017';
    var endDate = '03/31/2018';
    var blOpenTrans = true;
	/**
	 * Finds transactions of a customer according to the ID, Start and End date passed into it
	 * @param{String} customerId
	 * @param{String} startDate
	 * @param{String} endDate
	 * 
	 *@return {Object Array} arrResults 
	 */
    findTransactions(customerId, blOpenTrans, startDate, endDate);

	function findTransactions(customerId,blOpenTrans,startDate,endDate){
	
		var transactionSearchObj = search.create({
			   type: "transaction",
			   filters: [
			      ["trandate","within",startDate,endDate], 
			      "AND", 
			      ["name","anyof",customerId],
			      "AND",
			      [[["type","anyof","CashRfnd","CashSale","CustCred","CustInvc"],"AND", ["item.type","anyof","Service","OthCharge","NonInvtPart","Kit","Assembly","InvtPart"]],
                  "OR",
			       [["type","anyof","Journal"],"AND",["status","anyof","Journal:B"],"AND",["account","anyof","122"]],
			       "OR",
			       [["type","anyof","CustPymt"],"AND",["mainline","is","T"]]]
			      ],
			   columns: [
			      search.createColumn({
			         name: "trandate",
			         sort: search.Sort.ASC
			      }),
			      "transactionname",
			      search.createColumn({
			         name: "itemid",
			         join: "item"
			      }),
			      search.createColumn({
				         name: "salesdescription",
				         join: "item"
				      }),
				  "internalid",
				  "total",
			      "quantity",
			      "rate",
			      "netamount",
			      "taxline",
			      "shippingcost",
			      "location",
			      "amount",
			      "taxtotal",
			      "debitamount",
			      "amountpaid",
			      "creditamount",
			      "mainline",
			      "type"
			      
			   ]
			});
		
		if(blOpenTrans == true || blOpenTrans=='T'){
			
			var filters = search.createFilter({
				name: 'status',
				operator:'anyof',
				values:['CustInvc:A','CustCred:A','CustPymt:B','Journal:B'] //Invoice, Customer Credit, Customer Payment
			});
			transactionSearchObj.filters.push(filters);
		}
		
		var searchResultCount = transactionSearchObj.runPaged().count;
		log.debug('Transactions found',searchResultCount);

        var arrRes1 = [];

		var arrResults = transactionSearchObj.run().getRange(0, 1000);
          
		
		
		 return arrResults;
			
	}
	
    return findTransactions();
    
    
});