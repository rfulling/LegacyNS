
require(['N/record', 'N/search', 'N/format', 'N/runtime'],
    function (record, search, format, runtime) {

        function createAndSaveContactRecord() {

            var filters = [];
            filters.push(['mainline', 'is', 'T']);
            filters.push('and');
            filters.push(['custbody_bsg_work_order_type', 'noneof', '@NONE@']);
            filters.push('and');
            filters.push(['custbody_bsg_work_order_status', 'noneof', [8, 9]]);
            filters.push('and');

            

            var sDate = new Date("10//01/2018");

            var eDate = new Date("10/31/2018");
           // filters.push(['startdate', 'within', format.format({ value: sDate, type: format.Type.DATE }), format.format({ value: eDate, type: format.Type.DATE })]);

              filters.push(['startdate', 'on', format.format({ value: sDate, type: format.Type.DATE })]);


            log.debug({ title: 'FILTERS', details: filters });

            var woSearch = search.create({
                type: 'salesorder',
                filters: filters,
                columns: [
                    'custbody_bsg_asset_assigned_customer',
                    'custbody_bsg_asset_assigned_customer.entityid',
                    'custbody_bsg_asset_assigned_customer.companyname',
                    'tranid',
                    'custbody_bsg_assigned_tech',
                    'custbody_bsg_assigned_tech.custentity_bsg_zone',
                    'custbody_bsg_wo_service_addr_geocode',
                    'custbody_bsg_asset_card',
                    'custbody_bsg_work_order_start_time',
                    'custbody_bsg_work_order_type',
                    'custbody_bsg_work_order_status',
                    'custbody_bsg_job_duration',
                    'startdate'
                ]
            });

            var workOrders = woSearch.run().getRange({ start: 0, end: 1000 });
            log.debug({ title: 'WO LEN', details: workOrders.length });
            var geoCodeDetail = [];
            for (var i = 0; i < workOrders.length; i++) {
                geoCodeDetail.push({
                    label: 'WO# ' + workOrders[i].getValue({ name: 'tranid' }) + ' - ' + workOrders[i].getValue({ name: 'entityid', join: 'custbody_bsg_asset_assigned_customer' }) + ' ' + workOrders[i].getValue({ name: 'companyname', join: 'custbody_bsg_asset_assigned_customer' }),
                    position: {
                        lat: parseFloat(0),
                        lng: parseFloat(0)
                    },
                    work_order_id: workOrders[i].id,
                    custbody_bsg_assigned_tech: workOrders[i].getText({ name: 'custbody_bsg_assigned_tech' }),
                    custbody_bsg_assigned_tech_id: workOrders[i].getValue({ name: 'custbody_bsg_assigned_tech' }),
                    zone: workOrders[i].getText({ name: 'custentity_bsg_zone', join: 'custbody_bsg_assigned_tech' }),
                    zone_id: workOrders[i].getValue({ name: 'custentity_bsg_zone', join: 'custbody_bsg_assigned_tech' }),
                    custbody_bsg_asset_card: workOrders[i].getText({ name: 'custbody_bsg_asset_card' }),
                    custbody_bsg_asset_card_id: workOrders[i].getValue({ name: 'custbody_bsg_asset_card' }),
                    custbody_bsg_work_order_start_time: workOrders[i].getText({ name: 'custbody_bsg_work_order_start_time' }),
                    startdate: workOrders[i].getValue({ name: 'startdate' }),
                    custbody_bsg_work_order_type: workOrders[i].getText({ name: 'custbody_bsg_work_order_type' }),
                    custbody_bsg_work_order_status: workOrders[i].getText({ name: 'custbody_bsg_work_order_status' }),
                    custbody_bsg_work_order_status_id: workOrders[i].getValue({ name: 'custbody_bsg_work_order_status' }),
                    custbody_bsg_job_duration: workOrders[i].getText({ name: 'custbody_bsg_job_duration' }),
                    tranid: workOrders[i].getValue({ name: 'tranid' }),
                    custbody_bsg_asset_assigned_customer: workOrders[i].getText({ name: 'custbody_bsg_asset_assigned_customer' }),
                    custbody_bsg_asset_assigned_customer_id: workOrders[i].getValue({ name: 'custbody_bsg_asset_assigned_customer' }),
                    companyname: workOrders[i].getValue({ name: 'companyname', join: 'custbody_bsg_asset_assigned_customer' }),
                    entityid: workOrders[i].getValue({ name: 'entityid', join: 'custbody_bsg_asset_assigned_customer' })
                });
            }
        }

            createAndSaveContactRecord();
        });


