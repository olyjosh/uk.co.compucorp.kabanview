(function (angular, $, _) {

  app = angular.module('kabanview');

  app.constant('URL', {
    "CONTACT": "/civicrm/contact/view?reset=1&cid=",
    "ACTIVITY": "/civicrm/case/activity/view?",//cid=3&aid=1
    "CASE": "/civicrm/contact/view/case?reset=1&action=view&", //cid=5&id=5
  });

  app.config(function ($routeProvider) {
      $routeProvider.when('/kabanview', {
        controller: 'KabanviewKabanViewCtrl',
        templateUrl: '~/kabanview/KabanViewCtrl.html',

        resolve: {
          statusIDs: function (crmApi) {
            return crmApi('Case', 'get', {
              "sequential": 1,
              return: ["status_id"]
            });
          },
          cases: function (crmApi) {
            return crmApi('Case', 'get', {
              "sequential": 1
            });
          },
          caseContacts: function (crmApi) {
            // This can only retrive contact cases id without other detail. I hope civic improve this in future. Or am the one missing out on the api detail
            return crmApi('CaseContact', 'get', {
              return: ["id"]
            })
          }
        }
      });
    }
  )

  /**
   * KabanviewKabanViewCtrl, the main controller going down here.
   * */
  app.controller('KabanviewKabanViewCtrl',
    function ($scope, crmApi, crmStatus, crmUiHelp, statusIDs, cases, caseContacts, serve) {

      $scope.cases = serve.createLists(statusIDs.values, cases.values);
      $scope.caseContacts = caseContacts.values;

      serve.fillContacts(crmApi, $scope.caseContacts, 0, null);
      serve.fillActivityCounts(crmApi, $scope.caseContacts, 0, null);

      $scope.updateStatus = function (evt, ui) {
        var item = ui.draggable.scope().item;
        serve.updateCaseStatus(crmApi, crmStatus, item, 2)
      };

    });


  app.service('serve', function () {
    self = this;

    self.statusIDs = function (crmApi) {
      return crmApi('Case', 'get', {
        "sequential": 1,
        return: ["status_id"]
      })
    }


    // Recreating the entire model
    self.createLists = function (array, cases) {
      console.log("ARAY of status ID: \n"+ JSON.stringify(array));
      array = removeDuplicateStatusId(array);
      for (var i = 0; i < cases.length; i++) {
        var cas = cases[i];
        for (var j = 0; j < array.length; j++) {
          if (array[j].list === undefined) {
            array[j].list = [];
          }
          if (array[j].status_id === cas.status_id) {
            array[j].list.push(cas);
            cases.splice(i,1); // Getting buggy here, Will talk to you latter
            break;
          }
        }
      }

      array.sort(function (a, b) {
        return a.status_id > b.status_id;
      });
      return array;
    }

    //Do this to remove duplicate statusId since I didn't find the api to retrieve status id
    removeDuplicateStatusId = function (array) {
      var arr = [];
      counter = 0;
      while(counter<array.length){
        for (var i=0; i<array.length; i++){
          if(array[counter].status_id===array[i].status_id){
            array.splice(i,1);
          }
        }
        counter++;
      }
      return array;
    }

    //Retrieve contacts
    self.fillContacts = function (crmApi, contactArray, count, k) {
      var keys;
      if (k === null) keys = Object.keys(contactArray)
      else keys = k;
      var count = count;
      self.oneContact(crmApi, keys[count])
        .then(function (res) {
            contactArray[keys[count]] = res;
            count++;
            if (count < keys.length) {
              self.fillContacts(crmApi, contactArray, count, keys);
            }
          }
        );
    }

    self.oneContact = function (crmApi, id) {
      return crmApi('Contact', 'getsingle', {
        id: id,
        return: ['first_name', 'last_name', "image_URL"]
      });
    }

    // Retrieve Activity counts
    self.fillActivityCounts = function (crmApi, contactArray, count, k) {
      var keys;
      if (k === null) keys = Object.keys(contactArray)
      else keys = k;
      var count = count;
      self.getActivityCount(crmApi, keys[count])
        .then(function (res) {
            contactArray[keys[count]].actCount = res.count;
            console.log("Res " + JSON.stringify(contactArray[keys[count]]))
            count++;
            if (count < keys.length) {
              self.fillActivityCounts(crmApi, contactArray, count, keys);
            }
          }
        );
    }


    self.getActivityCount = function (crmApi, id) {
      return crmApi('Activity', 'get', {
        "sequential": 1,
        "case_id": id,
        return: ['id']
      });
    }

    self.updateCaseStatus = function (crmApi, crmStatus, item, statusResolveID) {

      return crmStatus(
        // Status messages. For defaults, just use "{}"
        {
          start: ts('Updating status ...'),
          success: ts('Case Status updated for ' + item.subject),
        },
        // The save action. Note that crmApi() returns a promise.
        crmApi('Case', 'create', {
          "sequential": 1,
          "id": item.id,
          "status_id": statusResolveID
        })
      );

    }

  });

})(angular, CRM.$, CRM._);


