module = QUnit.module;

module('transport');

test('correct transport wrapping', 1, function() {
    equal(
        transport('test/test', 'exports.test = 123;'),
        'require.def("test/test", function transport(require, exports, module){ exports.test = 123; });',
        'transport wrapper is correct'  
    );            
});
