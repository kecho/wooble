Debug = {
    LogError : function (msg)
    {
        var msg = "[ERROR] "+msg;
        if (console.log)
        {
            console.log(msg);
        }
        else
        {
            alert(msg);
        }
    }
}
