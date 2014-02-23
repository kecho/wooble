function ProgramEventListener()
{
}

ProgramEventListener.prototype = {
    OnError : function (args) {},
    OnLoaded : function (args) {},
    OnReady : function (args) {},
}

function Program(name)
{
    this.mName = name;
    this.mShaderList = null;
    this.mProgramHandle = null;
    this.mState = Program.STATE_NONE;
    this.mAttributeLocations = {};
    this.mUniforms = {};
}

Program.STATE_NONE = 0;
Program.STATE_FINISHED = 1;
Program.STATE_LOADING = 2;
Program.STATE_COMPILING = 3;
Program.STATE_LINKING = 4;
Program.STATE_ERROR = 5;

Program.TYPE_VERTEX = 0;
Program.TYPE_FRAGMENT = 1;

Program.CreateShaderList = function (nameList)
{
    var l = [];
    for (var i = 0; i < nameList.length; ++i)
    {
        l.push({name: nameList[i], src: null, handle: null, compiled: false });
    }

    return l;
}

Program.mGlobalShaderMap = {}

Program.prototype = {

    FindAndCacheUniform : function (gl, str)
    {
        var u = this.mUniforms[str];
        if (u == null || Core.IsUndefined(this.mUniforms[str]))
        {
            u = gl.getUniformLocation(this.GetHandle(), str);
            this.mUniforms[str] = u;
        }
        return u;
        
    },

    SetFloat : function (gl, str, value)
    {
        var u = this.FindAndCacheUniform(gl,str);
        gl.uniform1f(u, value);
    },

    SetFloat4 : function (gl, str, value)
    {
        var u = this.FindAndCacheUniform(gl,str);
        gl.uniform4fv(u, value);
    },


    SetFloat3 : function (gl, str, value)
    {
        var u = this.FindAndCacheUniform(gl,str);
        gl.uniform3fv(u, value);
    },
    
    SetInt : function (gl, str, value)
    {
        var u = this.FindAndCacheUniform(gl,str);
        gl.uniform1i(u, value);
    },

    SetTexture : function(gl, uniformName, texId, texture)
    {
        var u = this.FindAndCacheUniform(gl, uniformName);
        var glId = gl.TEXTURE0 + texId; 
        gl.activeTexture(glId); 
        gl.bindTexture(gl.TEXTURE_2D, texture.GetGlHandle());
        gl.uniform1i(u, texId);
    },

    RegisterVertexAttribute : function (id, loc)
    {
        this.mAttributeLocations[id] = loc;
    },

    GetVertexAttributeLocation : function (id)
    {
        return this.mAttributeLocations[id];
    },

    UpdateState : function (gl)
    {
        switch(this.mState)
        {
        case Program.STATE_NONE:
            {
                break;
            }
        case Program.STATE_LOADING:
            {
                if (this.AllShadersReady())
                {
                    this.OnLoaded(this.mShaderList);
                    this.mState = Program.STATE_COMPILING;
                }
                break;
            }
        case Program.STATE_COMPILING:
            this.CompileAllShaders(gl);
            break;
        case Program.STATE_LINKING:
            this.Link(gl);
            break;
        case Program.STATE_ERROR:
            break;
        case Program.STATE_READY:
            break;
        default:
        }
    },

    GetHandle : function () { return this.mProgramHandle; },

    Link : function (gl)
    {
        if (this.mProgramHandle != null)
        {
            gl.deleteProgram(this.mProgramHandle);
        }

        this.mProgramHandle = Render.CreateProgram (
            gl,
            this.mShaderList
        );
        this.mState = this.mProgramHandle == null ? Program.STATE_ERROR : Program.STATE_READY;
    },

    CompileAllShaders : function(gl)
    {
        var success = true;
        for (var i = 0; i < this.mShaderList.length; ++i)
        {
            var targetShaderDesc = this.mShaderList[i];
            if (targetShaderDesc.compiled == false)
            {
                if (targetShaderDesc.handle != null)
                {
                    gl.deleteShader(targetShaderDesc.handle);  
                } 
                targetShaderDesc.handle = Render.CreateShader(gl, targetShaderDesc);
                success = success && targetShaderDesc.handle != null;
                targetShaderDesc.compiled = true; 
            }
        }
        if (!success)
        {
            this.mState = Program.STATE_ERROR;
        }
        else
        {
            this.mState = Program.STATE_LINKING;
        }
    },

    AllShadersReady : function()
    {
        for (var i = 0; i < this.mShaderList.length; ++i)
        {
            if (this.mShaderList[i].src == null)
            {
                return false;
            }
        }
        return true;
    },

    StateReady : function ()
    {
        return this.mState == Program.STATE_READY;
    },

    StateError : function ()
    {
        return this.mState == Program.STATE_ERROR;
    },
    
    SetEventListener : function (eventListener)
    {
        this.mEventListener = eventListener; 
    },

    OnLoaded : function (args)
    {
        if (this.mEventListener) this.mEventListener.OnLoaded(args);
    },

    SetOnLoaded : function ()
    {
    },

    SetOnError : function () 
    {
    },

    Load : function (nameList)
    {
        var __self = this;
        this.mShaderList = Program.CreateShaderList(nameList);
        this.mState = Program.STATE_LOADING;
        for (var i = 0; i < this.mShaderList.length; ++i)
        {
            var shaderDesc = Program.mGlobalShaderMap[nameList[i]];
            if ( typeof(shadeDesc) != "undefined" )
            {
                this.mShaderList[i] = shaderDesc;
            }
            else
            {
                Core.LoadDoc (
                    Config.ShaderRoot+"/"+this.mShaderList[i].name,
                    function (name, text, listEl)
                    {
                        Program.mGlobalShaderMap[listEl.name] = listEl;
                        listEl.src = text; 
                    },
                    this.mShaderList[i]
                )
            };
        }
    },
}
