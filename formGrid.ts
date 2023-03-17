let $injector = widgetContext.$scope.$injector;
let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));
let entityService = $injector.get(widgetContext.servicesMap.get('entityService'));
let assetService = $injector.get(widgetContext.servicesMap.get('assetService'));
let deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));
let attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));
let dialogs = $injector.get(widgetContext.servicesMap.get('dialogs'));
let entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));

let myPageLink = widgetContext.pageLink(100);

openAssignXpmDialog();

function openAssignXpmDialog() {
    customDialog.customDialog(htmlTemplate, assignXpmController).subscribe();
}

function assignXpmController(instance) {
    let vm = instance;
    
    vm.entity = {};
    vm.attributes = {};
    vm.deviceList = [];
    vm.xpmAssigned = 0;
    vm.relatedLoads = [];
    vm.assignedLoadStatus = [];
    vm.entityNameOfRelatedLoads = [];
    vm.getHistory = [];
    vm.historyFrom = [];
    vm.listOfChannels = [];
    vm.maxDate = new Date().getTime();
    
    getEntityInfo();
    
    deviceService.getUserDevices(myPageLink).subscribe(data => {
        for (var i = 0; i < data.data.length; i++) {
            if (data.data[i].type === 'XPM') {
                isAvailable(data.data[i]);
            }
        }
    });
    
    vm.assignXpmFormGroup = vm.fb.group({
        xpmSelected: ['', [vm.validators.required]],
        channelAssigned: [''],
        getHistory: [false],
        historyFrom: ['']
    });
    
    vm.assignXpmFormGroup.get('channelAssigned').disable();
    vm.assignXpmFormGroup.get('getHistory').disable();
    vm.assignXpmFormGroup.get('historyFrom').disable();
    
    function getEntityInfo() {
        widgetContext.rxjs.forkJoin([
            attributeService.getEntityAttributes(entityId, 'SERVER_SCOPE'),
            entityService.getEntity(entityId.entityType, entityId.id)
        ]).subscribe(
            function (data) {
                getEntityAttributes(data[0]);
                vm.entity = data[1];
            }
        );
    }
    
    function isAvailable (xpm) {
        widgetContext.rxjs.forkJoin([
            attributeService.getEntityAttributes(xpm.id, 'SERVER_SCOPE', ['customerAssigned'])
        ]).subscribe(
            function (data) {
                if (data[0].length > 0) {
                    if (data[0][0].value === vm.attributes.customerName) {
                        vm.deviceList.push(xpm);
                    }
                }
            }
        );
    }
    
    function getEntityAttributes(attributes) {
        for (var i = 0; i < attributes.length; i++) {
            if (attributes[i].key === 'xpmAssigned') {
                vm.xpmAssigned = attributes[i].value;
            } else {
                vm.attributes[attributes[i].key] = attributes[i].value;
            }
        }
    }
    
    vm.cancel = function() {
        widgetContext.updateAliases();
        vm.dialogRef.close(null);
    };
    
    vm.save = function() {
        let xpmSelected = vm.assignXpmFormGroup.get('xpmSelected').value;
        let channelAssigned = vm.assignXpmFormGroup.get('channelAssigned').value;
        
        widgetContext.rxjs.forkJoin([
            saveLoadAttributes(xpmSelected, channelAssigned),
            saveXpmAttributes(xpmSelected, channelAssigned)
            ]).subscribe(
            function () {
                widgetContext.updateAliases();
                vm.dialogRef.close(null);
            }
        );
    };
    
    function saveLoadAttributes(xpmSelected, channelAssigned) {
        let attributes = [{
            key:'xpmAssignedStatus', value: true
        },{
            key:'xpmAssignedId', value: xpmSelected.id
        },{
            key:'xpmAssignedLabel', value: xpmSelected.label
        },{
            key:'xpmLoadAssigned', value: channelAssigned.index
        }];
        
        return attributeService.saveEntityAttributes(entityId, 'SERVER_SCOPE', attributes);
    }
    
    function saveXpmAttributes(xpmSelected, channelAssigned) {
        let attributes = [];
        let assignedLoadStatus = [];
        let entityNameOfRelatedLoads = [];
        let getHistory = [];
        let historyFrom = [];
        
        vm.assignedLoadStatus[channelAssigned.index] = true;
        vm.entityNameOfRelatedLoads[channelAssigned.index] = entityName;
        
        assignedLoadStatus = vm.assignedLoadStatus;
        entityNameOfRelatedLoads = vm.entityNameOfRelatedLoads;
        
        attributes = [{
            key:'assignedLoadStatus', value: assignedLoadStatus
        },{
            key:'entityNameOfRelatedLoads', value: entityNameOfRelatedLoads
        }];
        
        if (vm.assignXpmFormGroup.get('getHistory').value === true) {
            vm.getHistory[channelAssigned.index] = vm.assignXpmFormGroup.get('getHistory').value;
            vm.historyFrom[channelAssigned.index] = vm.assignXpmFormGroup.get('historyFrom').value;
            getHistory = vm.getHistory;
            historyFrom = vm.historyFrom;
            
            attributes.push({
                key: 'historyFrom', value: historyFrom
            },{
                key:'getHistory', value: getHistory
            });
        }
        
        
        console.log(attributes);
        
        //return widgetContext.rxjs.of([]);
        return attributeService.saveEntityAttributes(xpmSelected.id, 'SERVER_SCOPE', attributes);
    }
    
    vm.getXpmSelected = function(xpmSelected) {
        vm.assignXpmFormGroup.get('channelAssigned').enable();
        
        widgetContext.rxjs.forkJoin([
            attributeService.getEntityAttributes(
                xpmSelected.id, 
                'SERVER_SCOPE',
                ['assignedLoadStatus', 'getHistory', 'entityNameOfRelatedLoads']),
            attributeService.getEntityAttributes(
                xpmSelected.id,
                'CLIENT_SCOPE',
                ['ownLoads'])
            ]).subscribe(
            function (data) {
                console.log(data);
                let serverScope = data[0];
                let clientScope = data[1];
                
                for (var j = 0; j < serverScope.length; j++) {
                    vm[serverScope[j].key] = serverScope[j].value;
                }
                
                vm.relatedLoads = clientScope[0].value;
                
                for (let i = 0; i < vm.relatedLoads.length; i++) {
                    vm.listOfChannels.push({
                        index: i,
                        disabled: vm.assignedLoadStatus[i],
                        channel: 'Canal ' + i + ' ' + vm.entityNameOfRelatedLoads[i]
                    });
                }
            }
        );
        
        //console.log(vm.listOfChannels);
    };
    
    vm.setEnable = function (name) {
        vm.assignXpmFormGroup.get(name).enable();
    };
}