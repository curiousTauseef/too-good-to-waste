angular.module('ToGoodToWaste', ['ngMaterial', 'ngSanitize'])
    .config(function ($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .primaryPalette('green')
            .accentPalette('lime');
    })
    .controller('AppCtrl', function ($scope, $mdDialog, $http, $timeout, orderByFilter) {
        $scope.showAdvanced = function (ev, item) {
            $mdDialog.show({
                templateUrl: 'web/dialog-template.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: true,
                locals: {
                    item: item
                },
                controller: function DialogController($scope, $mdDialog, item) {
                    $scope.item = item;

                    $scope.hide = function () {
                        $mdDialog.hide();
                    };

                    $scope.cancel = function () {
                        $mdDialog.cancel();
                    };

                    $scope.answer = function (answer) {
                        $mdDialog.hide(answer);
                    };

                    $scope.getRecipe = function (item) {
                        var recipes = {
                            'Tomates': 'Tomato and Basil Pasta. With garden-ripened tomatoes and fragrant fresh basil, this pasta dish ' +
                                'needs very little enhancement to taste divine. Just add some sliced garlic, extra-virgin olive oil, ' +
                                'and burrata or mozzarella cheese, and dinner is ready.',
                            'Iogurtes': 'Don\'t forget to use the milk in your breakfast!',
                            'Queijo Fresco': 'Why don\'t you try an omelette?'
                        }

                        return recipes[item]
                    }
                }
            });
        };

        $scope.goToItem = function (item, event) {
            $mdDialog.show(
                $mdDialog.alert()
                .title(item.name)
                .htmlContent('Quantidade: ' + item.quantity)
                .ok('Done!')
                .targetEvent(event)
            );
        };

        $scope.navigateTo = function (to, event) {
            $mdDialog.show(
                $mdDialog.alert()
                .title('Navigating')
                .textContent('Imagine being taken to ' + to)
                .ok('Neat!')
                .targetEvent(event)
            );
        };

        $scope.doPrimaryAction = function (event) {
            $mdDialog.show(
                $mdDialog.alert()
                .title('Recipes')
                .textContent('Here will be a list of recipes')
                .ok('Awesome!')
                .targetEvent(event)
            );
        };

        $scope.doSecondaryAction = function (event) {
            $mdDialog.show(
                $mdDialog.confirm()
                .title('Remove?')
                .textContent('Have you used it already? Nice! No waste. Well done mate.')
                .ok('We are done here!')
                .cancel('Not yet...')
                .targetEvent(event)
            );
        };

        $scope.getItemImage = function (item) {
            var itemImages = {
                'Tomates': 'web/images/tomato.jpg',
                'Iogurtes': 'web/images/iogurte.jpg',
                'Queijo Fresco': 'web/images/queijo_fresco.jpeg',
                'Batatas': 'web/images/batatas.png',
                'Mirtilos': 'web/images/mirtilo.jpg',
                'Cebolas': 'web/images/cebola.jpeg',
                'Alface': 'web/images/alface.jpg',
                'Alhos': 'web/images/alho.jpeg'
            };

            return itemImages[item];
        }

        function isExpiringToday(item) {
            var today = new Date();
            var itemExpirationDate = new Date(item.expirationDate);
            var isToday = (today.toDateString() === itemExpirationDate.toDateString());

            return isToday;
        }

        function isExpiringAfterToday(item) {
            var tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
            var itemExpirationDate = new Date(item.expirationDate);
            var isExpiringAfterToday = (itemExpirationDate.toDateString() >= tomorrow.toDateString());

            return isExpiringAfterToday;
        }

        var poller = function () {
            $http({
                url: 'http://188.166.155.168:3000/expiring/aristides@pixels.camp?range=10',
                method: 'GET'
            }).then(function successCallback(response) {
                items = response.data;

                items = orderByFilter(items, 'item.expirationDate', true) || [];

                $scope.nextExpiringItems = items.filter(isExpiringAfterToday);
                $scope.todaysItems = items.filter(isExpiringToday);

                $timeout(poller, 1000)
            }, function errorCallback(response) {})
        }
        poller();
    });