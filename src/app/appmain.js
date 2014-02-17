window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                              window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;

function GameLoop(fps, fnOnFrame)
{
    this.mMillisecPerFrame = Math.floor(1000/fps);
    this.OnFrame = fnOnFrame;
}


GameLoop.prototype  = {
    Start : function ()
    {
        var startTime = Date.now();
        this.OnFrame(startTime);
        var endTime = Date.now();
        var delta = endTime - startTime;
        var __self = this;
        function __continue()
        {
            __self.Start();
        }
        window.requestAnimationFrame(__continue);
    }
}

function App(){ 
    var viewportDiv = document.getElementById("viewportDiv");
    this.mViewport = new Viewport(viewportDiv);
}  

App.prototype = {
    UpdateState : function ()
    {
        this.mViewport.UpdateState();
    },

    Render : function ()
    {
        this.mViewport.Render();
    },

    EnableDebugPasses : function ()
    {
        this.mViewport.EnableDebugPasses(
            Viewport.DebugPasses.SELECTION
        );
    },

    ToggleDebugSelectionPass : function ()
    {
        this.mViewport.ToggleDebugPasses(Viewport.DebugPasses.SELECTION); 
    }

}

var gA = null;
var gL = null;

function MainApp()
{
    gA = new App(); 
    gL = new GameLoop(60, UpdateApp);
    if (Config.DebugRenderPasses)
    {
        gA.EnableDebugPasses();
        document.addEventListener(
            "keydown",
            function (e)
            {
                if (String.fromCharCode(e.which) == "1")
                {
                    gA.ToggleDebugSelectionPass();
                }
            }
        );
    }
    gL.Start();
}

function UpdateApp(time)
{
    gA.UpdateState();
    gA.Render();
}

