define(function(require) {
    class UtilityClass{
        constructor() {}

        readTextFile(file, callback) { // this function gets JSON data from the given url/file path and calls the given callback on return
            var rawFile = new XMLHttpRequest();
            rawFile.overrideMimeType("application/json");
            rawFile.open("GET", file, true);
            rawFile.onreadystatechange = function() {
                if (rawFile.readyState === 4 && rawFile.status == "200") {
                    callback(rawFile.responseText);
                }
            }
            rawFile.send(null);
        }
    
    }
    var utility = new UtilityClass();
    return utility;
});