Core = {
    LoadDoc : function (doc, callback, extraArgs)
    {
        if (window.XMLHttpRequest)
        {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp=new XMLHttpRequest();
        }
        else
        {// code for IE6, IE5
            xmlhttp=new ActiveXObject("Microsoft.XMLHTTP");
        } 
        function _callbackwrap(args)
        {
            if (this.readyState == 4 && this.status == 200)
            {
                args.DocName = doc;
                callback(args.DocName, this.responseText, this._extraArgs);
            } 
        }
        xmlhttp.onreadystatechange = _callbackwrap;
        xmlhttp._extraArgs = extraArgs;
        xmlhttp.open("GET", doc, true);
        xmlhttp.send();
    },

    IsUndefined : function (variable)
    {
        return typeof(variable) == "undefined";
    }
}
