(function () {
    'use strict';
    
    /*global angular*/
    /*global cordova*/
    /*global console*/
    /*global StatusBar*/
    /*jshint -W009 */
    // Ionic Starter App

    // angular.module is a global place for creating, registering and retrieving Angular modules
    // 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
    // the 2nd parameter is an array of 'requires'
    var app = angular.module('app', ['ionic', 'ngAria', 'ngMaterial']);

    app.filter('range', function () {
        var i;
        return function (input, min, max) {
            min = parseInt(min, 10); //Make string input int
            max = parseInt(max, 10);
            for (i = min; i <= max; i += 1) {
                input.push(i);
            }
            return input;
        };
    });
    
    app.factory('$localstorage', ['$window', function ($window) {
        return {
            set: function (key, value) {
                $window.localStorage[key] = value;
            },
            get: function (key, defaultValue) {
                return $window.localStorage[key] || defaultValue;
            },
            setObject: function (key, value) {
                $window.localStorage[key] = JSON.stringify(value);
            },
            getObject: function (key) {
                return JSON.parse($window.localStorage[key] || '{}');
            }
        };
    }]);

    app.controller('ushrController', [ '$http', '$scope', '$filter', '$mdToast', '$timeout', '$log', '$ionicSideMenuDelegate', '$localstorage', function ($http, $scope, $filter, $mdToast, $timeout, $log, $ionicSideMenuDelegate, $localstorage) {
        var ushr = this,
            lsLayoutConfig = $localstorage.getObject('layoutConfig'),
            lsLayoutTotals = $localstorage.getObject('layoutTotals');
        
        ushr.layoutTotals = {
            Seats: 0,
            Available: 0,
            Occupied: 0,
            Rows: 0,
            MaxSeats: 0,
            WarningNbr: 0.15
        };
        
        $scope.maxSeats = [];
        
        $scope.getNumber = function (num) {
            var i, x = [];
            for (i = 1; i <= num; i += 1) { x.push(i); }
            return x;
        };
        
        function updateTotals() {
            var i;
            //Reset Totals
            ushr.layoutTotals.Seats = 0;
            ushr.layoutTotals.Available = 0;
            ushr.layoutTotals.Occupied = 0;
            ushr.layoutTotals.Rows = 0;
            ushr.layoutTotals.MaxSeats = 0;
            
            ushr.layoutConfig.forEach(function (section) {
                if (section.rowCount > ushr.layoutTotals.Rows) { ushr.layoutTotals.Rows = section.rowCount; }
                if (section.seatsPerRow > ushr.layoutTotals.MaxSeats) { ushr.layoutTotals.MaxSeats = section.seatsPerRow; }

                section.rows.forEach(function (row) {
                    row.seats.forEach(function (seat) {
                        ushr.layoutTotals.Seats += 1;
                        if (seat.open) { ushr.layoutTotals.Available += 1; } else { ushr.layoutTotals.Occupied += 1; }
                    });
                });
            });
            
            $scope.maxSeats = [];
            for (i = 1; i <= ushr.layoutTotals.MaxSeats; i += 1) { $scope.maxSeats.push(i); }
        }
        
        $scope.saveLocal = function () {
            // Put each ushr object in LocalStorage
            $localstorage.setObject('layoutConfig', ushr.layoutConfig);
            $localstorage.setObject('layoutTotals', ushr.layoutTotals);
            
            /*var testItem = localStorage.getItem('layoutConfig'), parsedItem = JSON.parse(testItem);
            $mdDialog.show( $mdDialog.alert({ title: 'Attention', content: parsedItem, ok: 'Close' })
            );*/
        };
        
        $scope.edit = function () {
            if ($scope.editMode) { $scope.editMode = false; } else { $scope.editMode = true; }
        };
        
        $scope.sectionsChange = function (val) {
            // Empty the configuration
            ushr.layoutConfig = [];
            ushr.sectionsSelected = [];
            
            while (val > ushr.layoutConfig.length) {
                if (ushr.layoutConfig.length === 0) {
                    ushr.layoutConfig.push({
                        id: 0,
                        name: 'section0',
                        rowCount: 0,
                        seatsPerRow: 0,
                        rows: [],
                        open: true,
                        selected: false,
                        orientation: 'horizontal'
                    });
                } else {
                    ushr.layoutConfig.push({
                        id: ushr.layoutConfig.length,
                        name: 'section' + ushr.layoutConfig.length,
                        rowCount: 0,
                        seatsPerRow: 0,
                        rows: [],
                        open: true,
                        selected: false,
                        orientation: 'horizontal'
                    });
                }
            }
            
            updateTotals();
        };
        
        if (lsLayoutConfig) { ushr.layoutConfig = lsLayoutConfig; } else { ushr.layoutConfig = []; }
        if (lsLayoutTotals) {
            ushr.layoutTotals = lsLayoutTotals;
        } else {
            ushr.layoutTotals = {
                Seats: 0,
                Available: 0,
                Occupied: 0,
                Rows: 0,
                MaxSeats: 0,
                WarningNbr: 0.15
            };
        }
        
        ushr.sectionsSelected = [];
        ushr.leftBoundarySelected = false;
        ushr.rightBoundarySelected = false;
        
        $scope.sectionSelect = function (section) {
            if (section.selected) { section.selected = false; } else { section.selected = true; }
            
            ushr.sectionsSelected = [];
            ushr.leftBoundarySelected = false;
            ushr.rightBoundarySelected = false;
            
            ushr.layoutConfig.forEach(function (sec) {
                if (sec.selected) {
                    ushr.sectionsSelected.push(sec);
                    if (sec.id === 0) { ushr.leftBoundarySelected = true; }
                    if (sec.id === ushr.layoutConfig[ushr.layoutConfig.length - 1].id) { ushr.rightBoundarySelected = true; }
                }
            });
        };
        
        $scope.openWarning = function ($event) {
            $mdToast.show($mdToast.simple().content('Seat availability is low.'));
        };
        
        $scope.$watch('ushr.layoutTotals.Available', function (newVal, oldVal) {
            var availPct = ushr.layoutTotals.Available / ushr.layoutTotals.Seats;
            
            if (availPct < 0.2) {
                $scope.openWarning();
            }
        });
        
        $scope.setOrientation = function (orientation) {
            ushr.layoutConfig.forEach(function (section) {
                if (section.selected) { section.orientation = orientation; }
            });
        };
        
        $scope.setRowCount = function (section) {
            var i = 0;
            section.rows = [];

            for (i = 0; i < section.rowCount; i += 1) {
                section.rows.push({
                    rowId: i,
                    seats: [{
                        seatId: 0,
                        open: true,
                        reserved: false
                    }],
                    open: true,
                    reserved: false
                });
            }
            if (section.seatsPerRow > 0) { $scope.setSeatCount(section); }
            
            updateTotals();
        };
        
        $scope.setSeatCount = function (section) {
            var i = 0;
            
            section.rows.forEach(function (row) {
                row.seats = [];

                for (i = 0; i < section.seatsPerRow; i += 1) {
                    row.seats.push({
                        seatId: i,
                        open: true,
                        reserved: false,
                        grouped: false
                    });
                }
            });
            updateTotals();
        };
        
        $scope.copyRows = function (rows) {
            ushr.layoutConfig.forEach(function (section) {
                section.rowCount = rows;
                $scope.setRowCount(section);
            });
        };
        
        $scope.copySeats = function (seats) {
            ushr.layoutConfig.forEach(function (section) {
                section.seatsPerRow = seats;
                $scope.setSeatCount(section);
            });
        };
        
        $scope.addRow = function (section) {
            var i, rowId = section.rows.length;
            section.rowCount += 1;
            section.rows.push({
                rowId: rowId,
                seats: [],
                open: true,
                reserved: false
            });
            if (section.seatsPerRow > 0) {
                for (i = 0; i < section.seatsPerRow; i += 1) {
                    section.rows[rowId].seats.push({
                        seatId: i,
                        open: true,
                        reserved: false,
                        grouped: false
                    });
                }
            }
            updateTotals();
        };
        
        $scope.toggleSeat = function (seat) {
            if (seat.open) { seat.open = false; } else { seat.open = true; }
            updateTotals();
        };
        
        $scope.rowClosed = function (row) {
            if (row.seats.length > 0) {
                row.seats.forEach(function (seat) {
                    seat.open = false;
                });
                updateTotals();
            }
        };
        
        $scope.findSeats = function (search) {
            var i, counter, findLoop = [];
            
            $scope.seatsFound = [];
            ushr.layoutConfig.forEach(function (section) {
                section.rows.forEach(function (row) {
                    row.seats.forEach(function (seat) {
                        seat.grouped = false;
                        findLoop = [];
                        if (seat.open) {
                            counter = 1;
                            findLoop.push(seat);
                            for (i = 1; (seat.seatId + i) < (row.seats.length); i += 1) {
                                if (row.seats[(seat.seatId + i)].open) {
                                    findLoop.push(row.seats[(seat.seatId + i)]);
                                    counter += 1;
                                } else {
                                    break;
                                }
                            }
                            if (counter >= search) {
                                findLoop.forEach(function (seat) {
                                    $scope.seatsFound.push(seat);
                                });
                            }
                        }
                    });
                });
            });
            
            $scope.seatsFound.forEach(function (seat) {
                seat.grouped = true;
            });
        };
        
        $scope.toggleRight = function () {
            $ionicSideMenuDelegate.toggleRight();
        };
        
        $scope.resetSeats = function () {
            ushr.layoutConfig.forEach(function (section) {
                section.rows.forEach(function (row) {
                    row.seats.forEach(function (seat) {
                        seat.open = true;
                        seat.grouped = false;
                    });
                });
            });
            updateTotals();
            localStorage.clear();
        };
        
        $scope.clearGrouped = function () {
            ushr.layoutConfig.forEach(function (section) {
                section.rows.forEach(function (row) {
                    row.seats.forEach(function (seat) {
                        seat.grouped = false;
                    });
                });
            });
        };
        
    }]);//End of Ushr Controller

    app.run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                StatusBar.styleDefault();
            }
        });
    });
}());