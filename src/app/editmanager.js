function EditManager(meshManager, mouseCmds)
{
    this.mMeshManager = meshManager;
    this.mMouseCmds = mouseCmds;
    this.mState = EditManager.STATE_IDLE;
    this.mWorldDisplacement = V3.$(0, 0, 0);
    this.mDepthCoefficientVector = V3.$(0, 0, 0);
    this.mWorldPivotPoint = V3.$(0, 0, 0);
    this.mMouseState = {
        bX : 0,
        bY : 0
    };
}

EditManager.GLOBAL_UNIT_VECTOR = V3.$(1,1,1);
EditManager.GLOBAL_ZERO_VECTOR = V3.$(0,0,0);
EditManager.tmp_vec = V3.$(0,0,0);

EditManager.STATE_VERTEX_MOVING = 0;
EditManager.STATE_COMPLETE = 1;
EditManager.STATE_IDLE = 2;

EditManager.prototype = {
    UpdateState : function (gl, camera)
    {
        switch (this.mState)
        {
        case EditManager.STATE_VERTEX_MOVING:
            this.UpdateDepthCoefficientVector(camera);
            this.ComputeHomogeneousXYZVector(camera);
            this.UpdateTranslation(gl);
        break;
        case EditManager.STATE_COMPLETE:
            this.mState = EditManager.STATE_IDLE;
        break;
        case EditManager.STATE_IDLE:
        default:
        break;
        }
    },

    OpenEditVertex : function ()
    {
        this.mState = EditManager.STATE_VERTEX_MOVING;
        this.mMouseState.bX = this.mMouseCmds.mClickCoords.x;
        this.mMouseState.bY = this.mMouseCmds.mClickCoords.y;
        
        //figure out the pivot point out of the selected vectors
        this.mMeshManager.ComputeAverageSelectedVertexCentroid(this.mWorldPivotPoint);
    },

    UpdateDepthCoefficientVector : function(camera)
    {
        V3.mul4x4(camera.GetView(), this.mWorldPivotPoint, this.mDepthCoefficientVector);
        EditManager.tmp_vec[0] = 1.0;
        EditManager.tmp_vec[1] = 1.0;
        EditManager.tmp_vec[2] = this.mDepthCoefficientVector[2];
        V3.mul4x4(camera.GetProj(), EditManager.tmp_vec, this.mDepthCoefficientVector);
    },

    ComputeHomogeneousXYZVector : function (camera)
    {
        //optimize multiplication of the depth
        EditManager.tmp_vec[0] = ((this.mMouseCmds.mClickCoords.x - this.mMouseState.bX) / camera.GetViewDims().width) * 2.0;
        EditManager.tmp_vec[1] = ((this.mMouseState.bY - this.mMouseCmds.mClickCoords.y ) / camera.GetViewDims().height) * 2.0;

        EditManager.tmp_vec[0] /= this.mDepthCoefficientVector[0];
        EditManager.tmp_vec[1] /= this.mDepthCoefficientVector[1];
        EditManager.tmp_vec[2] = 0;//flat direction
        V3.mulNoTrans(camera.GetViewITX(), EditManager.tmp_vec, this.mWorldDisplacement);
    },

    UpdateTranslation : function (gl)
    {
        this.mMeshManager.VisualizeTranslation(gl, this.mWorldDisplacement);
    },

    RequestLockSelections : function ()
    {
        return this.mState != EditManager.STATE_IDLE;
    },

    FinishCommand : function ()
    {
        if (this.mState == EditManager.STATE_VERTEX_MOVING)
        {
            this.mState = EditManager.STATE_COMPLETE;
        }
    }

}
