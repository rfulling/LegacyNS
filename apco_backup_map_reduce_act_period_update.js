/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define([
        'N/search',
        'N/record',
        'N/error',
        'N/runtime',
        'N/email',
        'N/config'
], function (search, record, error, runtime, email, config) {

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @typedef {Object} ObjectRef
     * @property {number} id - Internal ID of the record instance
     * @property {string} type - Record type id
     *
     * @return {Array|Object|Search|RecordRef} inputSummary
     * @since 2015.1
     */
    function handleErrorAndSendNotification(e, stage) {
        log.error('Stage: ' + stage + ' failed', e);

        var author = -5;
        var recipients = 'notify@company.com';
        var subject = 'Map/Reduce script ' + runtime.getCurrentScript().id + ' failed for stage: ' + stage;
        var body = 'An error occurred with the following information:\n' +
                   'Error code: ' + e.name + '\n' +
                   'Error msg: ' + e.message;

        // email.send({
        //     auth/or: author,
        //    recipients: recipients,
        //     subject: subject,
        //      body: body
        //  });
    }

    function handleErrorIfAny(summary) {
        var inputSummary = summary.inputSummary;
        var mapSummary = summary.mapSummary;
        var reduceSummary = summary.reduceSummary;

        log.debug('ReduceSummary ' + reduceSummary);

        if (inputSummary.error) {
            var e = error.create({
                name: 'INPUT_STAGE_FAILED',
                message: inputSummary.error
            });
            handleErrorAndSendNotification(e, 'getInputData');
        }

        handleErrorInStage('map', mapSummary);
        handleErrorInStage('reduce', reduceSummary);
    }

    function handleErrorInStage(stage, summary) {
        var errorMsg = [];
        summary.errors.iterator().each(function (key, value) {
            var msg = 'Failure to accept payment from customer id: ' + key + '. Error was: ' + JSON.parse(value).message + '\n';
            errorMsg.push(msg);
            return true;
        });
        if (errorMsg.length > 0) {
            var e = error.create({
                name: 'RECORD_TRANSFORM_FAILED',
                message: JSON.stringify(errorMsg)
            });
            handleErrorAndSendNotification(e, stage);
        }
    }

    function createSummaryRecord(summary) {
        try {
            var seconds = summary.seconds;
            var usage = summary.usage;
            var yields = summary.yields;
        }

        catch (e) {
            handleErrorAndSendNotification(e, 'summarize');
        }
    }

    function getInputData() {
        var scriptObj = runtime.getCurrentScript();
        log.debug("Script parameter of custscript1: ", scriptObj.getParameter({ name: 'custscript_actPeriod' }));
        var strField = scriptObj.getParameter({ name: 'custscript_actPeriod' });
        log.debug('period ', strField);

        var jobSearch = search.create({
            type: search.Type.JOB,
            columns: [
                'custentity_apco_proj_period',
                'internalid',
                'enddate',
                'startdate'
            ],
            filters: [
                search.createFilter({
                    name: 'custentity_apco_proj_period',
                    operator: search.Operator.NONEOF,
                    values: strField
                }),

                search.createFilter({
                    name: 'internalid',
                    operator: search.Operator.ANYOF,
                    values: '36885'
                }),


                search.createFilter({
                    name: 'isinactive',
                    operator: search.Operator.IS,
                    values: false
                })
            ]
        });


        return jobSearch;

    }

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     *
     * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
     * @since 2015.1
     */
    function map(context) {
        var searchResult = JSON.parse(context.value);
        log.debug('RAW Map Data', context.value);

        context.write({
            key: searchResult.values.internalid.value,
            value: searchResult.values.custentity_apco_proj_period

        });

    }

    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
     * @since 2015.1
     */
    function reduce(context) {
        log.debug('REDUCE', context.key);
        //Create the field Variable here
        //var scriptObj = runtime.getCurrentScript();
        //var actPeriod = scriptObj.getParameter({name: 'custscript_actPeriod'});
        // this is the global parameter custscript_apco_acct_period
        //var actPeriod = 125;//scriptObj.getParameter({name: 'custscript_apco_acct_period'});

        companyInfo = config.load({
            type: config.Type.COMPANY_PREFERENCES
        });
        var actPeriod = companyInfo.getValue({
            fieldId: 'custscript_actperiod'
        });

        log.debug('REDUCE Period ', actPeriod);

        var rec = record.load({
            type: record.Type.JOB,
            id: context.key
        });

        var clearField = rec.getValue({ fieldId: 'custentity_apco_proj_dont_clr' })
        var startDate = rec.getValue({ fieldId: 'startdate' })
        var endDate = rec.getValue({ fieldId: 'endDate' })

        log.debug('REDUCEPay clearField ', clearField);

        // 	log.debug('lines ', numLines);	
        if (clearField == true) {
            rec.setValue({ fieldId: 'custentity_apco_proj_period', value: actPeriod });
            rec.setValue({ fieldId: 'custentity_apco_reviewed_approved', value: false });
            rec.setValue({ fieldId: 'custentity_apco_proj_period_start_date', value: startDate });
            rec.setValue({ fieldId: 'custentity_apco_proj_period_end_date', value: endDate });

        } else if (clearField == false) {
            rec.setValue({ fieldId: 'custentity_apco_proj_period', value: actPeriod });
            rec.setValue({ fieldId: 'custentity_apco_reviewed_approved', value: false });
            rec.setValue({ fieldId: 'custentity_apco_acctg_ptd_rev_rec_or_val', value: null });
            rec.setValue({ fieldId: 'custentity_apco_acctg_ptd_rev_rec_or_pct', value: null });
            rec.setValue({ fieldId: 'custentity_apco_proj_period_start_date', value: startDate });
            rec.setValue({ fieldId: 'custentity_apco_proj_period_end_date', value: endDate });
            rec.setValue({ fieldId: 'percentcomplete', value: null });
        }
        var recordId = rec.save({
            enableSourcing: true,
            ignoreMandatoryFields: true
        });
    }


    /**
     * Executes when the summarize entry point is triggered and applies to the result set.
     *
     * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
     * @since 2015.1
     */
    function summarize(summary) {
        handleErrorIfAny(summary);
        createSummaryRecord(summary);
    }

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };

});
