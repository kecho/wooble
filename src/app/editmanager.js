function EditManager(meshManager, mouseCmds)
{
    this.mMeshManager = meshManager;
    this.mMouseCmds = mouseCmds;
    this.mState = EditManager.STATE_IDLE;
    this.mHomogeneousVector = V3.$(0, 0, 0);
    this.mWorldPivotPoint = V3.$(0, 0, 0);
    this.mMouseState = {
        bX : 0,
        bY : 0
    };
}

EditManager.STATE_VERTEX_MOVING = 0;
EditManager.STATE_COMPLETE = 1;
EditManager.STATE_IDLE = 2;

EditManager.prototype = {
    UpdateState : function (gl, camera)
    {
        switch (this.mState)
        {
        case EditManager.STATE_VERTEX_MOVING:
            this.ComputeHomogeneousXYZVector(camera);
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

    ComputeHomogeneousXYZVector : function (camera)
    {
        //optimize multiplication of the depth
        V3.mul4x4(camera.GetViewProj(), this.mWorldPivotPoint, this.mHomogeneousVector);
        this.mHomogeneousVector[0] = ((this.mMouseCmds.mClickCoords.x - this.mMouseState.bX) / camera.GetViewDims().width) * 2.0;
        this.mHomogeneousVector[1] = ((this.mMouseState.bY - this.mMouseCmds.mClickCoords.y ) / camera.GetViewDims().height) * 2.0;
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
