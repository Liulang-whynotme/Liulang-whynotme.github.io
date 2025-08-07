export class MakeRing
{
    constructor() 
    {
        this.Radius = 10;
        this.Width = 3;
        this.TwistNum = 0;
        this.ParticleNum = 32;

        this.PositionsA;
        this.TransverseVectorsA;
        this.ForcesA;
        this.MomentsA;
        this.TorquesA;
        this.RefDistance;
        this.CollisionDistance;

        this.PositionsB;
        this.TransverseVectorsB;
        this.ForcesB;
        this.MomentsB;
        this.TorquesB;

        this.PositionsA_interpolated;
        this.TransverseVectorsA_interpolated;
        this.PositionsB_interpolated;
        this.TransverseVectorsB_interpolated;
        this.ParticleNum_interpolated;
        this.InterpolationNum = 8;

        this.TensileStiffness = 1;
        this.BendingStiffness = 0.3;
        this.YawStiffness = 1;
        this.TwistStiffness = 0.01;
        this.RepulsionFactor = 0.2;

        this.TimeStep = 0.2;

        this.fixedPointID_Left = -1;
        this.fixedPointMesh_Left = 'A';
        this.fixedPointID_Right = -1;
        this.fixedPointMesh_Right = 'A';
    }

    InitializeParticles(THREE)
    {
        this.PositionsA = new Array(this.ParticleNum);
        this.TransverseVectorsA = new Array(this.ParticleNum);
        this.ForcesA = new Array(this.ParticleNum);
        this.MomentsA = new Array(this.ParticleNum);
        this.TorquesA = new Array(this.ParticleNum);

        this.ParticleNum_interpolated = this.ParticleNum * this.InterpolationNum;
        this.PositionsA_interpolated = new Array(this.ParticleNum_interpolated);
        this.TransverseVectorsA_interpolated = new Array(this.ParticleNum_interpolated);

        for (let i = 0; i < this.ParticleNum; i ++) 
        {
            const gamma = 2 * Math.PI * i / this.ParticleNum;
            const theta = Math.PI * this.TwistNum * i / this.ParticleNum;

            this.PositionsA[i] = new THREE.Vector3(Math.cos(gamma) * this.Radius, 0, Math.sin(gamma) * this.Radius);
            this.TransverseVectorsA[i] = new THREE.Vector3(Math.sin(gamma + 0.5 * Math.PI) * Math.sin(theta), Math.cos(theta), -Math.cos(gamma + 0.5 * Math.PI) * Math.sin(theta));
            this.ForcesA[i] = new THREE.Vector3();
            this.MomentsA[i] = new THREE.Vector3();
            this.TorquesA[i] = new THREE.Vector3();

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                this.PositionsA_interpolated[i * this.InterpolationNum + j] = new THREE.Vector3();
                this.TransverseVectorsA_interpolated[i * this.InterpolationNum + j] = new THREE.Vector3();
            }
        }
        
        this.RefDistance = 2*this.Radius*Math.sin(Math.PI/this.ParticleNum);
        this.Width = 3;
        this.CollisionDistance = this.RefDistance * 2;

        this.PositionsB = null;
        this.TransverseVectorsB = null;
        this.ForcesB = null;
        this.MomentsB = null;
        this.TorquesB = null;
        this.PositionsB_interpolated = null;
        this.TransverseVectorsB_interpolated = null;
        
        this.fixedPointID_Left = -1;
        this.fixedPointMesh_Left = 'A';
        this.fixedPointID_Right = -1;
        this.fixedPointMesh_Right = 'A';

        this.InterpolateTheParticles(THREE);
    }

    DoubleTheParticles(THREE)
    {
        this.PositionsB = new Array(this.ParticleNum);
        this.TransverseVectorsB = new Array(this.ParticleNum);
        this.ForcesB = new Array(this.ParticleNum);
        this.MomentsB = new Array(this.ParticleNum);
        this.TorquesB = new Array(this.ParticleNum);

        this.PositionsB_interpolated = new Array(this.ParticleNum_interpolated);
        this.TransverseVectorsB_interpolated = new Array(this.ParticleNum_interpolated);

        for (let i = 0; i < this.ParticleNum; i ++) 
        {
            this.PositionsA[i].sub(new THREE.Vector3().copy(this.TransverseVectorsA[i]).multiplyScalar(this.Width/4));
            this.PositionsB[i] = new THREE.Vector3().subVectors(this.PositionsA[i], new THREE.Vector3().copy(this.TransverseVectorsA[i]).multiplyScalar(-this.Width/2));
            this.TransverseVectorsB[i] = new THREE.Vector3().copy(this.TransverseVectorsA[i]);
            this.ForcesB[i] = new THREE.Vector3();
            this.MomentsB[i] = new THREE.Vector3();
            this.TorquesB[i] = new THREE.Vector3();

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                this.PositionsB_interpolated[i * this.InterpolationNum + j] = new THREE.Vector3();
                this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j] = new THREE.Vector3();
            }
        }
        this.Width = this.Width/2;
        this.RepulsionFactor = 0;
    }

    InterpolateTheParticles(THREE)
    {
        var Tangent_Pos1;
        var Tangent_Pos2;
        var Tangent_Vec1;
        var Tangent_Vec2;
        var t;
        var H0;
        var H1;
        var H2;
        var H3;

        for (let i = 1; i < this.ParticleNum - 2; i ++)
        {
            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[i + 1], this.PositionsA[i - 1]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[i + 2], this.PositionsA[i]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsA[i + 1], this.TransverseVectorsA[i - 1]).multiplyScalar(0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[i]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[i])));
            Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsA[i + 2], this.TransverseVectorsA[i]).multiplyScalar(0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[i + 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[i + 1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[i * this.InterpolationNum + j].x = this.PositionsA[i].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[i + 1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[i * this.InterpolationNum + j].y = this.PositionsA[i].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[i + 1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[i * this.InterpolationNum + j].z = this.PositionsA[i].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[i + 1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsA_interpolated[i * this.InterpolationNum + j].x = this.TransverseVectorsA[i].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsA[i + 1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsA_interpolated[i * this.InterpolationNum + j].y = this.TransverseVectorsA[i].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsA[i + 1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsA_interpolated[i * this.InterpolationNum + j].z = this.TransverseVectorsA[i].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsA[i + 1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsA_interpolated[i * this.InterpolationNum + j].normalize();
            }
        }

        if (this.PositionsB && this.TwistNum % 2 !== 0)
        {
            for (let i = 1; i < this.ParticleNum - 2; i ++)
            {
                Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[i + 1], this.PositionsB[i - 1]).multiplyScalar(0.5);
                Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[i + 2], this.PositionsB[i]).multiplyScalar(0.5);
                Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsB[i + 1], this.TransverseVectorsB[i - 1]).multiplyScalar(0.5);
                Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[i]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[i])));
                Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsB[i + 2], this.TransverseVectorsB[i]).multiplyScalar(0.5);
                Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[i + 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[i + 1])));

                for (let j = 0; j < this.InterpolationNum; j ++)
                {
                    t = j / this.InterpolationNum;
                    H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                    H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                    H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                    H3 = Math.pow(t, 3) - Math.pow(t, 2);

                    this.PositionsB_interpolated[i * this.InterpolationNum + j].x = this.PositionsB[i].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[i + 1].x * H2 + Tangent_Pos2.x * H3;
                    this.PositionsB_interpolated[i * this.InterpolationNum + j].y = this.PositionsB[i].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[i + 1].y * H2 + Tangent_Pos2.y * H3;
                    this.PositionsB_interpolated[i * this.InterpolationNum + j].z = this.PositionsB[i].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[i + 1].z * H2 + Tangent_Pos2.z * H3;

                    this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].x = this.TransverseVectorsB[i].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[i + 1].x * H2 + Tangent_Vec2.x * H3;
                    this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].y = this.TransverseVectorsB[i].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[i + 1].y * H2 + Tangent_Vec2.y * H3;
                    this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].z = this.TransverseVectorsB[i].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[i + 1].z * H2 + Tangent_Vec2.z * H3;
                    this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].normalize();
                }
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[1], this.PositionsB[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[2], this.PositionsA[0]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().addVectors(this.TransverseVectorsA[1], this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[0]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[0])));
            Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsA[2], this.TransverseVectorsA[0]).multiplyScalar(0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[j].x = this.PositionsA[0].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[j].y = this.PositionsA[0].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[j].z = this.PositionsA[0].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsA_interpolated[j].x = this.TransverseVectorsA[0].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsA[1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsA_interpolated[j].y = this.TransverseVectorsA[0].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsA[1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsA_interpolated[j].z = this.TransverseVectorsA[0].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsA[1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsA_interpolated[j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[this.ParticleNum - 1], this.PositionsA[this.ParticleNum - 3]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[0], this.PositionsA[this.ParticleNum - 2]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsA[this.ParticleNum - 1], this.TransverseVectorsA[this.ParticleNum - 3]).multiplyScalar(0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[this.ParticleNum - 2])));
            Tangent_Vec2 = new THREE.Vector3().addVectors(this.TransverseVectorsB[0], this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(-0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[this.ParticleNum - 1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.PositionsA[this.ParticleNum - 2].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[this.ParticleNum - 1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.PositionsA[this.ParticleNum - 2].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[this.ParticleNum - 1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.PositionsA[this.ParticleNum - 2].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[this.ParticleNum - 1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.TransverseVectorsA[this.ParticleNum - 2].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsA[this.ParticleNum - 1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.TransverseVectorsA[this.ParticleNum - 2].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsA[this.ParticleNum - 1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.TransverseVectorsA[this.ParticleNum - 2].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsA[this.ParticleNum - 1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[0], this.PositionsA[this.ParticleNum - 2]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[1], this.PositionsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().addVectors(this.TransverseVectorsB[0], this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(-0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[this.ParticleNum - 1])));
            Tangent_Vec2 = new THREE.Vector3().addVectors(this.TransverseVectorsB[1], this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(-0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[0]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[0])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.PositionsA[this.ParticleNum - 1].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[0].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.PositionsA[this.ParticleNum - 1].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[0].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.PositionsA[this.ParticleNum - 1].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[0].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.TransverseVectorsA[this.ParticleNum - 1].x * H0 + Tangent_Vec1.x * H1 - this.TransverseVectorsB[0].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.TransverseVectorsA[this.ParticleNum - 1].y * H0 + Tangent_Vec1.y * H1 - this.TransverseVectorsB[0].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.TransverseVectorsA[this.ParticleNum - 1].z * H0 + Tangent_Vec1.z * H1 - this.TransverseVectorsB[0].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[1], this.PositionsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[2], this.PositionsB[0]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().addVectors(this.TransverseVectorsB[1], this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[0]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[0])));
            Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsB[2], this.TransverseVectorsB[0]).multiplyScalar(0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsB_interpolated[j].x = this.PositionsB[0].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsB_interpolated[j].y = this.PositionsB[0].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsB_interpolated[j].z = this.PositionsB[0].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsB_interpolated[j].x = this.TransverseVectorsB[0].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsB_interpolated[j].y = this.TransverseVectorsB[0].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsB_interpolated[j].z = this.TransverseVectorsB[0].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsB_interpolated[j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[this.ParticleNum - 1], this.PositionsB[this.ParticleNum - 3]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[0], this.PositionsB[this.ParticleNum - 2]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsB[this.ParticleNum - 1], this.TransverseVectorsB[this.ParticleNum - 3]).multiplyScalar(0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[this.ParticleNum - 2]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[this.ParticleNum - 2])));
            Tangent_Vec2 = new THREE.Vector3().addVectors(this.TransverseVectorsA[0], this.TransverseVectorsB[this.ParticleNum - 2]).multiplyScalar(-0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[this.ParticleNum - 1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.PositionsB[this.ParticleNum - 2].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[this.ParticleNum - 1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.PositionsB[this.ParticleNum - 2].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[this.ParticleNum - 1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.PositionsB[this.ParticleNum - 2].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[this.ParticleNum - 1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.TransverseVectorsB[this.ParticleNum - 2].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[this.ParticleNum - 1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.TransverseVectorsB[this.ParticleNum - 2].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[this.ParticleNum - 1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.TransverseVectorsB[this.ParticleNum - 2].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[this.ParticleNum - 1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[0], this.PositionsB[this.ParticleNum - 2]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[1], this.PositionsB[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().addVectors(this.TransverseVectorsA[0], this.TransverseVectorsB[this.ParticleNum - 2]).multiplyScalar(-0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[this.ParticleNum - 1])));
            Tangent_Vec2 = new THREE.Vector3().addVectors(this.TransverseVectorsA[1], this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(-0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[0]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[0])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.PositionsB[this.ParticleNum - 1].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[0].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.PositionsB[this.ParticleNum - 1].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[0].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.PositionsB[this.ParticleNum - 1].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[0].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.TransverseVectorsB[this.ParticleNum - 1].x * H0 + Tangent_Vec1.x * H1 - this.TransverseVectorsA[0].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.TransverseVectorsB[this.ParticleNum - 1].y * H0 + Tangent_Vec1.y * H1 - this.TransverseVectorsA[0].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.TransverseVectorsB[this.ParticleNum - 1].z * H0 + Tangent_Vec1.z * H1 - this.TransverseVectorsA[0].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].normalize();
            }
        }else
        {
            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[1], this.PositionsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[2], this.PositionsA[0]).multiplyScalar(0.5);
            if (this.TwistNum % 2 !== 0)
            {
                Tangent_Vec1 = new THREE.Vector3().addVectors(this.TransverseVectorsA[1], this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            }else
            {
                Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsA[1], this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            }
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[0]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[0])));
            Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsA[2], this.TransverseVectorsA[0]).multiplyScalar(0.5);
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[j].x = this.PositionsA[0].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[j].y = this.PositionsA[0].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[j].z = this.PositionsA[0].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsA_interpolated[j].x = this.TransverseVectorsA[0].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsA[1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsA_interpolated[j].y = this.TransverseVectorsA[0].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsA[1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsA_interpolated[j].z = this.TransverseVectorsA[0].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsA[1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsA_interpolated[j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[this.ParticleNum - 1], this.PositionsA[this.ParticleNum - 3]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[0], this.PositionsA[this.ParticleNum - 2]).multiplyScalar(0.5);
            Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsA[this.ParticleNum - 1], this.TransverseVectorsA[this.ParticleNum - 3]).multiplyScalar(0.5);
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[this.ParticleNum - 2])));
            if (this.TwistNum % 2 !== 0)
            {
                Tangent_Vec2 = new THREE.Vector3().addVectors(this.TransverseVectorsA[0], this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(-0.5);
            }else
            {
                Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsA[0], this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(0.5);
            }
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[this.ParticleNum - 1])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.PositionsA[this.ParticleNum - 2].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[this.ParticleNum - 1].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.PositionsA[this.ParticleNum - 2].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[this.ParticleNum - 1].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.PositionsA[this.ParticleNum - 2].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[this.ParticleNum - 1].z * H2 + Tangent_Pos2.z * H3;

                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.TransverseVectorsA[this.ParticleNum - 2].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsA[this.ParticleNum - 1].x * H2 + Tangent_Vec2.x * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.TransverseVectorsA[this.ParticleNum - 2].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsA[this.ParticleNum - 1].y * H2 + Tangent_Vec2.y * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.TransverseVectorsA[this.ParticleNum - 2].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsA[this.ParticleNum - 1].z * H2 + Tangent_Vec2.z * H3;
                this.TransverseVectorsA_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].normalize();
            }

            Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsA[0], this.PositionsA[this.ParticleNum - 2]).multiplyScalar(0.5);
            Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsA[1], this.PositionsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            if (this.TwistNum % 2 !== 0)
            {
                Tangent_Vec1 = new THREE.Vector3().addVectors(this.TransverseVectorsA[0], this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(-0.5);
                Tangent_Vec2 = new THREE.Vector3().addVectors(this.TransverseVectorsA[1], this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(-0.5);
            }else
            {
                Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsA[0], this.TransverseVectorsA[this.ParticleNum - 2]).multiplyScalar(0.5);
                Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsA[1], this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(0.5);
            }
            Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsA[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsA[this.ParticleNum - 1])));
            Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsA[0]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsA[0])));

            for (let j = 0; j < this.InterpolationNum; j ++)
            {
                t = j / this.InterpolationNum;
                H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                H3 = Math.pow(t, 3) - Math.pow(t, 2);

                this.PositionsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.PositionsA[this.ParticleNum - 1].x * H0 + Tangent_Pos1.x * H1 + this.PositionsA[0].x * H2 + Tangent_Pos2.x * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.PositionsA[this.ParticleNum - 1].y * H0 + Tangent_Pos1.y * H1 + this.PositionsA[0].y * H2 + Tangent_Pos2.y * H3;
                this.PositionsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.PositionsA[this.ParticleNum - 1].z * H0 + Tangent_Pos1.z * H1 + this.PositionsA[0].z * H2 + Tangent_Pos2.z * H3;

                if (this.TwistNum % 2 !== 0)
                {
                    this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.TransverseVectorsA[this.ParticleNum - 1].x * H0 + Tangent_Vec1.x * H1 - this.TransverseVectorsA[0].x * H2 + Tangent_Vec2.x * H3;
                    this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.TransverseVectorsA[this.ParticleNum - 1].y * H0 + Tangent_Vec1.y * H1 - this.TransverseVectorsA[0].y * H2 + Tangent_Vec2.y * H3;
                    this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.TransverseVectorsA[this.ParticleNum - 1].z * H0 + Tangent_Vec1.z * H1 - this.TransverseVectorsA[0].z * H2 + Tangent_Vec2.z * H3;
                }else
                {
                    this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.TransverseVectorsA[this.ParticleNum - 1].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsA[0].x * H2 + Tangent_Vec2.x * H3;
                    this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.TransverseVectorsA[this.ParticleNum - 1].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsA[0].y * H2 + Tangent_Vec2.y * H3;
                    this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.TransverseVectorsA[this.ParticleNum - 1].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsA[0].z * H2 + Tangent_Vec2.z * H3;
                }

                this.TransverseVectorsA_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].normalize();
            }

            if (this.PositionsB)
            {
                for (let i = 1; i < this.ParticleNum - 2; i ++)
                {
                    Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[i + 1], this.PositionsB[i - 1]).multiplyScalar(0.5);
                    Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[i + 2], this.PositionsB[i]).multiplyScalar(0.5);
                    Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsB[i + 1], this.TransverseVectorsB[i - 1]).multiplyScalar(0.5);
                    Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[i]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[i])));
                    Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsB[i + 2], this.TransverseVectorsB[i]).multiplyScalar(0.5);
                    Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[i + 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[i + 1])));

                    for (let j = 0; j < this.InterpolationNum; j ++)
                    {
                        t = j / this.InterpolationNum;
                        H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                        H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                        H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                        H3 = Math.pow(t, 3) - Math.pow(t, 2);

                        this.PositionsB_interpolated[i * this.InterpolationNum + j].x = this.PositionsB[i].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[i + 1].x * H2 + Tangent_Pos2.x * H3;
                        this.PositionsB_interpolated[i * this.InterpolationNum + j].y = this.PositionsB[i].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[i + 1].y * H2 + Tangent_Pos2.y * H3;
                        this.PositionsB_interpolated[i * this.InterpolationNum + j].z = this.PositionsB[i].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[i + 1].z * H2 + Tangent_Pos2.z * H3;

                        this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].x = this.TransverseVectorsB[i].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[i + 1].x * H2 + Tangent_Vec2.x * H3;
                        this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].y = this.TransverseVectorsB[i].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[i + 1].y * H2 + Tangent_Vec2.y * H3;
                        this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].z = this.TransverseVectorsB[i].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[i + 1].z * H2 + Tangent_Vec2.z * H3;
                        this.TransverseVectorsB_interpolated[i * this.InterpolationNum + j].normalize();
                    }
                }

                Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[1], this.PositionsB[this.ParticleNum - 1]).multiplyScalar(0.5);
                Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[2], this.PositionsB[0]).multiplyScalar(0.5);
                Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsB[1], this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(0.5);
                Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[0]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[0])));
                Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsB[2], this.TransverseVectorsB[0]).multiplyScalar(0.5);
                Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[1])));

                for (let j = 0; j < this.InterpolationNum; j ++)
                {
                    t = j / this.InterpolationNum;
                    H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                    H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                    H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                    H3 = Math.pow(t, 3) - Math.pow(t, 2);

                    this.PositionsB_interpolated[j].x = this.PositionsB[0].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[1].x * H2 + Tangent_Pos2.x * H3;
                    this.PositionsB_interpolated[j].y = this.PositionsB[0].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[1].y * H2 + Tangent_Pos2.y * H3;
                    this.PositionsB_interpolated[j].z = this.PositionsB[0].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[1].z * H2 + Tangent_Pos2.z * H3;

                    this.TransverseVectorsB_interpolated[j].x = this.TransverseVectorsB[0].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[1].x * H2 + Tangent_Vec2.x * H3;
                    this.TransverseVectorsB_interpolated[j].y = this.TransverseVectorsB[0].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[1].y * H2 + Tangent_Vec2.y * H3;
                    this.TransverseVectorsB_interpolated[j].z = this.TransverseVectorsB[0].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[1].z * H2 + Tangent_Vec2.z * H3;
                    this.TransverseVectorsB_interpolated[j].normalize();
                }

                Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[this.ParticleNum - 1], this.PositionsB[this.ParticleNum - 3]).multiplyScalar(0.5);
                Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[0], this.PositionsB[this.ParticleNum - 2]).multiplyScalar(0.5);
                Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsB[this.ParticleNum - 1], this.TransverseVectorsB[this.ParticleNum - 3]).multiplyScalar(0.5);
                Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[this.ParticleNum - 2]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[this.ParticleNum - 2])));
                Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsB[0], this.TransverseVectorsB[this.ParticleNum - 2]).multiplyScalar(0.5);
                Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[this.ParticleNum - 1])));

                for (let j = 0; j < this.InterpolationNum; j ++)
                {
                    t = j / this.InterpolationNum;
                    H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                    H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                    H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                    H3 = Math.pow(t, 3) - Math.pow(t, 2);

                    this.PositionsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.PositionsB[this.ParticleNum - 2].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[this.ParticleNum - 1].x * H2 + Tangent_Pos2.x * H3;
                    this.PositionsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.PositionsB[this.ParticleNum - 2].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[this.ParticleNum - 1].y * H2 + Tangent_Pos2.y * H3;
                    this.PositionsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.PositionsB[this.ParticleNum - 2].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[this.ParticleNum - 1].z * H2 + Tangent_Pos2.z * H3;

                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].x = this.TransverseVectorsB[this.ParticleNum - 2].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[this.ParticleNum - 1].x * H2 + Tangent_Vec2.x * H3;
                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].y = this.TransverseVectorsB[this.ParticleNum - 2].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[this.ParticleNum - 1].y * H2 + Tangent_Vec2.y * H3;
                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].z = this.TransverseVectorsB[this.ParticleNum - 2].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[this.ParticleNum - 1].z * H2 + Tangent_Vec2.z * H3;
                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 2) * this.InterpolationNum + j].normalize();
                }

                Tangent_Pos1 = new THREE.Vector3().subVectors(this.PositionsB[0], this.PositionsB[this.ParticleNum - 2]).multiplyScalar(0.5);
                Tangent_Pos2 = new THREE.Vector3().subVectors(this.PositionsB[1], this.PositionsB[this.ParticleNum - 1]).multiplyScalar(0.5);
                Tangent_Vec1 = new THREE.Vector3().subVectors(this.TransverseVectorsB[0], this.TransverseVectorsB[this.ParticleNum - 2]).multiplyScalar(0.5);
                Tangent_Vec2 = new THREE.Vector3().subVectors(this.TransverseVectorsB[1], this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(0.5);
                Tangent_Vec1.sub(new THREE.Vector3().copy(this.TransverseVectorsB[this.ParticleNum - 1]).multiplyScalar(Tangent_Vec1.dot(this.TransverseVectorsB[this.ParticleNum - 1])));
                Tangent_Vec2.sub(new THREE.Vector3().copy(this.TransverseVectorsB[0]).multiplyScalar(Tangent_Vec2.dot(this.TransverseVectorsB[0])));

                for (let j = 0; j < this.InterpolationNum; j ++)
                {
                    t = j / this.InterpolationNum;
                    H0 = 2 * Math.pow(t, 3) - 3*Math.pow(t,2) + 1;
                    H1 = Math.pow(t, 3) - 2 * Math.pow(t, 2) + t;
                    H2 = -2 * Math.pow(t, 3) + 3 * Math.pow(t, 2);
                    H3 = Math.pow(t, 3) - Math.pow(t, 2);

                    this.PositionsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.PositionsB[this.ParticleNum - 1].x * H0 + Tangent_Pos1.x * H1 + this.PositionsB[0].x * H2 + Tangent_Pos2.x * H3;
                    this.PositionsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.PositionsB[this.ParticleNum - 1].y * H0 + Tangent_Pos1.y * H1 + this.PositionsB[0].y * H2 + Tangent_Pos2.y * H3;
                    this.PositionsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.PositionsB[this.ParticleNum - 1].z * H0 + Tangent_Pos1.z * H1 + this.PositionsB[0].z * H2 + Tangent_Pos2.z * H3;

                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].x = this.TransverseVectorsB[this.ParticleNum - 1].x * H0 + Tangent_Vec1.x * H1 + this.TransverseVectorsB[0].x * H2 + Tangent_Vec2.x * H3;
                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].y = this.TransverseVectorsB[this.ParticleNum - 1].y * H0 + Tangent_Vec1.y * H1 + this.TransverseVectorsB[0].y * H2 + Tangent_Vec2.y * H3;
                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].z = this.TransverseVectorsB[this.ParticleNum - 1].z * H0 + Tangent_Vec1.z * H1 + this.TransverseVectorsB[0].z * H2 + Tangent_Vec2.z * H3;
                    this.TransverseVectorsB_interpolated[(this.ParticleNum - 1) * this.InterpolationNum + j].normalize();
                }
            }
        }
    }
    
    RunDynamics(THREE, delta, pointCoordinate)
    {
        var Distance1 = 0;
        var Distance2 = 0;
        var Force1 = new THREE.Vector3(0, 0, 0);
        var Force2 = new THREE.Vector3(0, 0, 0);
        var Force3 = new THREE.Vector3(0, 0, 0);
        var Moment1 = new THREE.Vector3(0, 0, 0);
        var Moment2 = new THREE.Vector3(0, 0, 0);
        var Torque = new THREE.Vector3(0, 0, 0);
        var PairVector = new THREE.Vector3(0, 0, 0);
        var ProjectionVector1 = new THREE.Vector3(0, 0, 0);
        var ProjectionVector2 = new THREE.Vector3(0, 0, 0);

        for (let i = 0; i < this.ParticleNum; i ++)
        {
            if (i < this.ParticleNum - 1)
            {
                Distance1 = this.PositionsA[i].distanceTo(this.PositionsA[i+1]);
                PairVector.subVectors(this.PositionsA[i+1], this.PositionsA[i]).divideScalar(Distance1);
                Force1.copy(PairVector).multiplyScalar((Distance1 - this.RefDistance) / this.RefDistance * this.TensileStiffness);
                this.ForcesA[i].add(Force1);
                this.ForcesA[i+1].sub(Force1);

                ProjectionVector1.subVectors(this.TransverseVectorsA[i], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsA[i])));
                Moment1.subVectors(ProjectionVector1, this.TransverseVectorsA[i]).multiplyScalar(this.YawStiffness);

                this.MomentsA[i].add(Moment1);
                ProjectionVector2.subVectors(this.TransverseVectorsA[i+1], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsA[i+1])));
                Moment2.subVectors(ProjectionVector2, this.TransverseVectorsA[i+1]).multiplyScalar(this.YawStiffness);
                this.MomentsA[i+1].add(Moment2);

                Torque.subVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                this.TorquesA[i].add(Torque);
                this.TorquesA[i+1].sub(Torque);

                if (this.PositionsB)
                {
                    Distance1 = this.PositionsB[i].distanceTo(this.PositionsB[i+1]);
                    PairVector.subVectors(this.PositionsB[i+1], this.PositionsB[i]).divideScalar(Distance1);
                    Force1.copy(PairVector).multiplyScalar((Distance1 - this.RefDistance) / this.RefDistance * this.TensileStiffness);
                    this.ForcesB[i].add(Force1);
                    this.ForcesB[i+1].sub(Force1);

                    ProjectionVector1.subVectors(this.TransverseVectorsB[i], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsB[i])));
                    Moment1.subVectors(ProjectionVector1, this.TransverseVectorsB[i]).multiplyScalar(this.YawStiffness);

                    this.MomentsB[i].add(Moment1);
                    ProjectionVector2.subVectors(this.TransverseVectorsB[i+1], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsB[i+1])));
                    Moment2.subVectors(ProjectionVector2, this.TransverseVectorsB[i+1]).multiplyScalar(this.YawStiffness);
                    this.MomentsB[i+1].add(Moment2);

                    Torque.subVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                    this.TorquesB[i].add(Torque);
                    this.TorquesB[i+1].sub(Torque);
                }

                if (i === this.ParticleNum - 2)
                {
                    if (this.PositionsB && this.TwistNum%2!==0)
                    {
                        Distance2 = this.PositionsA[i].distanceTo(this.PositionsB[0]);
                        Force2.subVectors(this.PositionsB[0], this.PositionsA[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                        this.ForcesA[i].add(Force2);
                        this.ForcesB[0].sub(Force2);

                        Distance2 = this.PositionsB[i].distanceTo(this.PositionsA[0]);
                        Force2.subVectors(this.PositionsA[0], this.PositionsB[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                        this.ForcesB[i].add(Force2);
                        this.ForcesA[0].sub(Force2);
                    }else
                    {
                        Distance2 = this.PositionsA[i].distanceTo(this.PositionsA[0]);
                        Force2.subVectors(this.PositionsA[0], this.PositionsA[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                        this.ForcesA[i].add(Force2);
                        this.ForcesA[0].sub(Force2);

                        if (this.PositionsB)
                        {
                            Distance2 = this.PositionsB[i].distanceTo(this.PositionsB[0]);
                            Force2.subVectors(this.PositionsB[0], this.PositionsB[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                            this.ForcesB[i].add(Force2);
                            this.ForcesB[0].sub(Force2);
                        }
                    }
                }else
                {
                    Distance2 = this.PositionsA[i].distanceTo(this.PositionsA[i+2]);
                    Force2.subVectors(this.PositionsA[i+2], this.PositionsA[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                    this.ForcesA[i].add(Force2);
                    this.ForcesA[i+2].sub(Force2);

                    if (this.PositionsB)
                    {
                        Distance2 = this.PositionsB[i].distanceTo(this.PositionsB[i+2]);
                        Force2.subVectors(this.PositionsB[i+2], this.PositionsB[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                        this.ForcesB[i].add(Force2);
                        this.ForcesB[i+2].sub(Force2);
                    }
                }
            }
            else
            {
                if (this.PositionsB&&this.TwistNum%2!==0)
                {
                    Distance1 = this.PositionsA[i].distanceTo(this.PositionsB[0]);
                    PairVector.subVectors(this.PositionsB[0], this.PositionsA[i]).divideScalar(Distance1);
                    Force1.copy(PairVector).multiplyScalar((Distance1 - this.RefDistance) / this.RefDistance * this.TensileStiffness);
                    this.ForcesA[i].add(Force1);
                    this.ForcesB[0].sub(Force1);

                    ProjectionVector1.subVectors(this.TransverseVectorsA[i], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsA[i])));
                    Moment1.subVectors(ProjectionVector1, this.TransverseVectorsA[i]).multiplyScalar(this.YawStiffness);
                    this.MomentsA[i].add(Moment1);

                    ProjectionVector2.subVectors(this.TransverseVectorsB[0], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsB[0])));
                    Moment2.subVectors(ProjectionVector2, this.TransverseVectorsB[0]).multiplyScalar(this.YawStiffness);
                    this.MomentsB[0].add(Moment2);

                    Torque.addVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                    this.TorquesA[i].sub(Torque);
                    this.TorquesB[0].sub(Torque);

                    Distance1 = this.PositionsB[i].distanceTo(this.PositionsA[0]);
                    PairVector.subVectors(this.PositionsA[0], this.PositionsB[i]).divideScalar(Distance1);
                    Force1.copy(PairVector).multiplyScalar((Distance1 - this.RefDistance) / this.RefDistance * this.TensileStiffness);
                    this.ForcesB[i].add(Force1);
                    this.ForcesA[0].sub(Force1);

                    ProjectionVector1.subVectors(this.TransverseVectorsB[i], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsB[i])));
                    Moment1.subVectors(ProjectionVector1, this.TransverseVectorsB[i]).multiplyScalar(this.YawStiffness);
                    this.MomentsB[i].add(Moment1);

                    ProjectionVector2.subVectors(this.TransverseVectorsA[0], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsA[0])));
                    Moment2.subVectors(ProjectionVector2, this.TransverseVectorsA[0]).multiplyScalar(this.YawStiffness);
                    this.MomentsA[0].add(Moment2);

                    Torque.addVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                    this.TorquesB[i].sub(Torque);
                    this.TorquesA[0].sub(Torque);

                    Distance2 = this.PositionsA[i].distanceTo(this.PositionsB[1]);
                    Force2.subVectors(this.PositionsB[1], this.PositionsA[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                    this.ForcesA[i].add(Force2);
                    this.ForcesB[1].sub(Force2);

                    Distance2 = this.PositionsB[i].distanceTo(this.PositionsA[1]);
                    Force2.subVectors(this.PositionsA[1], this.PositionsB[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                    this.ForcesB[i].add(Force2);
                    this.ForcesA[1].sub(Force2);
                }else
                {
                    Distance1 = this.PositionsA[i].distanceTo(this.PositionsA[0]);
                    PairVector.subVectors(this.PositionsA[0], this.PositionsA[i]).divideScalar(Distance1);
                    Force1.copy(PairVector).multiplyScalar((Distance1 - this.RefDistance) / this.RefDistance * this.TensileStiffness);
                    this.ForcesA[i].add(Force1);
                    this.ForcesA[0].sub(Force1);

                    ProjectionVector1.subVectors(this.TransverseVectorsA[i], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsA[i])));
                    Moment1.subVectors(ProjectionVector1, this.TransverseVectorsA[i]).multiplyScalar(this.YawStiffness);
                    this.MomentsA[i].add(Moment1);

                    ProjectionVector2.subVectors(this.TransverseVectorsA[0], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsA[0])));
                    Moment2.subVectors(ProjectionVector2, this.TransverseVectorsA[0]).multiplyScalar(this.YawStiffness);
                    this.MomentsA[0].add(Moment2);

                    if (this.TwistNum % 2 === 0)
                    {
                        Torque.subVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                        this.TorquesA[i].add(Torque);
                        this.TorquesA[0].sub(Torque);
                    }else
                    {
                        Torque.addVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                        this.TorquesA[i].sub(Torque);
                        this.TorquesA[0].sub(Torque);
                    }

                    Distance2 = this.PositionsA[i].distanceTo(this.PositionsA[1]);
                    Force2.subVectors(this.PositionsA[1], this.PositionsA[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                    this.ForcesA[i].add(Force2);
                    this.ForcesA[1].sub(Force2);

                    if (this.PositionsB)
                    {
                        Distance1 = this.PositionsB[i].distanceTo(this.PositionsB[0]);
                        PairVector.subVectors(this.PositionsB[0], this.PositionsB[i]).divideScalar(Distance1);
                        Force1.copy(PairVector).multiplyScalar((Distance1 - this.RefDistance) / this.RefDistance * this.TensileStiffness);
                        this.ForcesB[i].add(Force1);
                        this.ForcesB[0].sub(Force1);

                        ProjectionVector1.subVectors(this.TransverseVectorsB[i], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsB[i])));
                        Moment1.subVectors(ProjectionVector1, this.TransverseVectorsB[i]).multiplyScalar(this.YawStiffness);
                        this.MomentsB[i].add(Moment1);

                        ProjectionVector2.subVectors(this.TransverseVectorsB[0], PairVector.multiplyScalar(PairVector.dot(this.TransverseVectorsB[0])));
                        Moment2.subVectors(ProjectionVector2, this.TransverseVectorsB[0]).multiplyScalar(this.YawStiffness);
                        this.MomentsB[0].add(Moment2);

                        Torque.subVectors(ProjectionVector2, ProjectionVector1).multiplyScalar(this.TwistStiffness);
                        this.TorquesB[i].add(Torque);
                        this.TorquesB[0].sub(Torque);

                        Distance2 = this.PositionsB[i].distanceTo(this.PositionsB[1]);
                        Force2.subVectors(this.PositionsB[1], this.PositionsB[i]).multiplyScalar(Math.min(Distance2 - this.RefDistance * 2, 0) / (this.RefDistance * Distance2 * 2) * this.BendingStiffness);
                        this.ForcesB[i].add(Force2);
                        this.ForcesB[1].sub(Force2);
                    }
                }
            }

            if ( i === this.fixedPointID_Left)
            {
                if (this.fixedPointMesh_Left==='A')
                {
                    const T = new THREE.Vector3().subVectors(delta, new THREE.Vector3().copy(this.TransverseVectorsA[i]).multiplyScalar(delta.dot(this.TransverseVectorsA[i]))).multiplyScalar(pointCoordinate.y*0.03);
                    this.TorquesA[i].add(T);
                    this.TorquesA[this.fixedPointID_Right].add(T);
                }else
                {
                    const T = new THREE.Vector3().subVectors(delta, new THREE.Vector3().copy(this.TransverseVectorsB[i]).multiplyScalar(delta.dot(this.TransverseVectorsB[i]))).multiplyScalar(pointCoordinate.y*0.03);
                    this.TorquesB[i].add(T);
                    this.TorquesB[this.fixedPointID_Right].add(T);
                }
            }
        }

        if (this.PositionsB&&this.TwistNum%2!==0)
        {
            for (let i = 0; i < this.ParticleNum*2; i ++)
            {
                for (let j = i + 3; j < Math.min(this.ParticleNum*2+i-2, this.ParticleNum*2); j ++)
                {
                    var Entering;
                    if (i<this.ParticleNum)
                    {
                        if (j<this.ParticleNum)
                        {
                            Entering = this.CollisionDistance - this.PositionsA[i].distanceTo(this.PositionsA[j]);
                            if (Entering > 0)
                            {
                                Force3 = new THREE.Vector3().subVectors(this.PositionsA[i], this.PositionsA[j]).normalize().multiplyScalar(Entering*this.RepulsionFactor);
                                this.ForcesA[i].add(Force3);
                                this.ForcesA[j].sub(Force3);
                            }
                        }else
                        {
                            Entering = this.CollisionDistance - this.PositionsA[i].distanceTo(this.PositionsB[j-this.ParticleNum]);
                            if (Entering > 0)
                            {
                                Force3 = new THREE.Vector3().subVectors(this.PositionsA[i], this.PositionsB[j-this.ParticleNum]).normalize().multiplyScalar(Entering*this.RepulsionFactor);
                                this.ForcesA[i].add(Force3);
                                this.ForcesB[j-this.ParticleNum].sub(Force3);
                            }
                        }
                    }else
                    {
                        Entering = this.CollisionDistance - this.PositionsB[i-this.ParticleNum].distanceTo(this.PositionsB[j-this.ParticleNum]);
                        if (Entering > 0)
                        {
                            Force3 = new THREE.Vector3().subVectors(this.PositionsB[i-this.ParticleNum], this.PositionsB[j-this.ParticleNum]).normalize().multiplyScalar(Entering*this.RepulsionFactor);
                            this.ForcesB[i-this.ParticleNum].add(Force3);
                            this.ForcesB[j-this.ParticleNum].sub(Force3);
                        }
                    }
                }
            }
        }else
        {
            for (let i = 0; i < this.ParticleNum; i ++)
            {
                for (let j = i + 3; j < Math.min(this.ParticleNum+i-2, this.ParticleNum); j ++)
                {
                    const Entering = this.CollisionDistance - this.PositionsA[i].distanceTo(this.PositionsA[j]);
                    if (Entering > 0)
                    {
                        Force3 = new THREE.Vector3().subVectors(this.PositionsA[i], this.PositionsA[j]).normalize().multiplyScalar(Entering*this.RepulsionFactor);
                        this.ForcesA[i].add(Force3);
                        this.ForcesA[j].sub(Force3);
                    }
                }

                if (this.PositionsB)
                {
                    for (let j = i + 3; j < Math.min(this.ParticleNum+i-2, this.ParticleNum); j ++)
                    {
                        const Entering = this.CollisionDistance - this.PositionsB[i].distanceTo(this.PositionsB[j]);
                        if (Entering > 0)
                        {
                            Force3 = new THREE.Vector3().subVectors(this.PositionsB[i], this.PositionsB[j]).normalize().multiplyScalar(Entering*this.RepulsionFactor);
                            this.ForcesB[i].add(Force3);
                            this.ForcesB[j].sub(Force3);
                        }
                    }

                    for (let j = 0; j < this.ParticleNum; j ++)
                    {
                        const Entering = this.CollisionDistance - this.PositionsB[i].distanceTo(this.PositionsA[j]);
                        if (Entering > 0)
                        {
                            Force3 = new THREE.Vector3().subVectors(this.PositionsB[i], this.PositionsA[j]).normalize().multiplyScalar(Entering*this.RepulsionFactor);
                            this.ForcesB[i].add(Force3);
                            this.ForcesA[j].sub(Force3);
                        }
                    }
                }
            }
        }


        for (let i = 0; i < this.ParticleNum; i ++)
        {
            this.PositionsA[i].add(this.ForcesA[i].multiplyScalar(this.TimeStep));
            this.TransverseVectorsA[i].add(this.MomentsA[i].multiplyScalar(this.TimeStep)).add(this.TorquesA[i].multiplyScalar(this.TimeStep)).normalize();
            this.ForcesA[i] = new THREE.Vector3();
            this.MomentsA[i] = new THREE.Vector3();
            this.TorquesA[i] = new THREE.Vector3();

            if (this.PositionsB)
            {
                this.PositionsB[i].add(this.ForcesB[i].multiplyScalar(this.TimeStep));
                this.TransverseVectorsB[i].add(this.MomentsB[i].multiplyScalar(this.TimeStep)).add(this.TorquesB[i].multiplyScalar(this.TimeStep)).normalize();
                this.ForcesB[i] = new THREE.Vector3();
                this.MomentsB[i] = new THREE.Vector3();
                this.TorquesB[i] = new THREE.Vector3();
            }
        }
    }

    Dragging(THREE, dragStartPoint, delta, pointCoordinate)
    {
        if (this.fixedPointID_Left !== -1)
        {
            if (this.PositionsB)
            {
                if (this.fixedPointMesh_Left==='A')
                {
                    if (this.fixedPointMesh_Right==='A')
                    {
                        const X = new THREE.Vector3().subVectors(this.PositionsA[this.fixedPointID_Right], this.PositionsA[this.fixedPointID_Left]);
                        const Y = new THREE.Vector3().copy(this.TransverseVectorsA[this.fixedPointID_Left]).multiplyScalar(this.Width/2);
                        const P = new THREE.Vector3().addVectors(dragStartPoint, delta).sub(X.multiplyScalar(pointCoordinate.x)).sub(Y.multiplyScalar(pointCoordinate.y));
                        this.PositionsA[this.fixedPointID_Right].add(new THREE.Vector3().subVectors(P, this.PositionsA[this.fixedPointID_Left]).multiplyScalar(0.01));
                        this.PositionsA[this.fixedPointID_Left].lerp(P, 0.01);
                    }else
                    {
                        const X = new THREE.Vector3().subVectors(this.PositionsB[this.fixedPointID_Right], this.PositionsA[this.fixedPointID_Left]);
                        const Y = new THREE.Vector3().copy(this.TransverseVectorsA[this.fixedPointID_Left]).multiplyScalar(this.Width/2);
                        const P = new THREE.Vector3().addVectors(dragStartPoint, delta).sub(X.multiplyScalar(pointCoordinate.x)).sub(Y.multiplyScalar(pointCoordinate.y));
                        this.PositionsB[this.fixedPointID_Right].add(new THREE.Vector3().subVectors(P, this.PositionsA[this.fixedPointID_Left]).multiplyScalar(0.01));
                        this.PositionsA[this.fixedPointID_Left].lerp(P, 0.01);
                    }
                }else
                {
                    if (this.fixedPointMesh_Right==='A')
                    {
                        const X = new THREE.Vector3().subVectors(this.PositionsA[this.fixedPointID_Right], this.PositionsB[this.fixedPointID_Left]);
                        const Y = new THREE.Vector3().copy(this.TransverseVectorsB[this.fixedPointID_Left]).multiplyScalar(this.Width/2);
                        const P = new THREE.Vector3().addVectors(dragStartPoint, delta).sub(X.multiplyScalar(pointCoordinate.x)).sub(Y.multiplyScalar(pointCoordinate.y));
                        this.PositionsA[this.fixedPointID_Right].add(new THREE.Vector3().subVectors(P, this.PositionsB[this.fixedPointID_Left]).multiplyScalar(0.01));
                        this.PositionsB[this.fixedPointID_Left].lerp(P, 0.01);
                    }else
                    {
                        const X = new THREE.Vector3().subVectors(this.PositionsB[this.fixedPointID_Right], this.PositionsB[this.fixedPointID_Left]);
                        const Y = new THREE.Vector3().copy(this.TransverseVectorsB[this.fixedPointID_Left]).multiplyScalar(this.Width/2);
                        const P = new THREE.Vector3().addVectors(dragStartPoint, delta).sub(X.multiplyScalar(pointCoordinate.x)).sub(Y.multiplyScalar(pointCoordinate.y));
                        this.PositionsB[this.fixedPointID_Right].add(new THREE.Vector3().subVectors(P, this.PositionsB[this.fixedPointID_Left]).multiplyScalar(0.01));
                        this.PositionsB[this.fixedPointID_Left].lerp(P, 0.01);
                    }
                }
            }else
            {
                const X = new THREE.Vector3().subVectors(this.PositionsA[this.fixedPointID_Right], this.PositionsA[this.fixedPointID_Left]);
                const Y = new THREE.Vector3().copy(this.TransverseVectorsA[this.fixedPointID_Left]).multiplyScalar(this.Width/2);
                const P = new THREE.Vector3().addVectors(dragStartPoint, delta).sub(X.multiplyScalar(pointCoordinate.x)).sub(Y.multiplyScalar(pointCoordinate.y));
                this.PositionsA[this.fixedPointID_Right].add(new THREE.Vector3().subVectors(P, this.PositionsA[this.fixedPointID_Left]).multiplyScalar(0.01));
                this.PositionsA[this.fixedPointID_Left].lerp(P, 0.01);
            }
        }
    }

    updateVertices(THREE, geometryA, geometryB)
    {
        const verticesArrayA = new Float32Array((this.ParticleNum_interpolated + 2) * 6);
        const verticesArrayB = new Float32Array((this.ParticleNum_interpolated + 2) * 6);

        if (geometryB&&this.TwistNum%2!==0)
        {
            for (let i = 0; i < this.ParticleNum_interpolated; i++) 
            {
                verticesArrayA[i*6] = this.PositionsA_interpolated[i].x + this.TransverseVectorsA_interpolated[i].x * this.Width/2;
                verticesArrayA[i*6+1] = this.PositionsA_interpolated[i].y + this.TransverseVectorsA_interpolated[i].y * this.Width/2;
                verticesArrayA[i*6+2] = this.PositionsA_interpolated[i].z + this.TransverseVectorsA_interpolated[i].z * this.Width/2;
                verticesArrayA[i*6+3] = this.PositionsA_interpolated[i].x - this.TransverseVectorsA_interpolated[i].x * this.Width/2;
                verticesArrayA[i*6+4] = this.PositionsA_interpolated[i].y - this.TransverseVectorsA_interpolated[i].y * this.Width/2;
                verticesArrayA[i*6+5] = this.PositionsA_interpolated[i].z - this.TransverseVectorsA_interpolated[i].z * this.Width/2;
            }
            verticesArrayA[this.ParticleNum_interpolated*6] = this.PositionsB_interpolated[0].x + this.TransverseVectorsB_interpolated[0].x * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+1] = this.PositionsB_interpolated[0].y + this.TransverseVectorsB_interpolated[0].y * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+2] = this.PositionsB_interpolated[0].z + this.TransverseVectorsB_interpolated[0].z * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+3] = this.PositionsB_interpolated[0].x - this.TransverseVectorsB_interpolated[0].x * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+4] = this.PositionsB_interpolated[0].y - this.TransverseVectorsB_interpolated[0].y * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+5] = this.PositionsB_interpolated[0].z - this.TransverseVectorsB_interpolated[0].z * this.Width/2;

            geometryA.setAttribute('position', new THREE.BufferAttribute(verticesArrayA, 3));

            for (let i = 0; i < this.ParticleNum_interpolated; i++) 
            {
                verticesArrayB[i*6] = this.PositionsB_interpolated[i].x + this.TransverseVectorsB_interpolated[i].x * this.Width/2;
                verticesArrayB[i*6+1] = this.PositionsB_interpolated[i].y + this.TransverseVectorsB_interpolated[i].y * this.Width/2;
                verticesArrayB[i*6+2] = this.PositionsB_interpolated[i].z + this.TransverseVectorsB_interpolated[i].z * this.Width/2;
                verticesArrayB[i*6+3] = this.PositionsB_interpolated[i].x - this.TransverseVectorsB_interpolated[i].x * this.Width/2;
                verticesArrayB[i*6+4] = this.PositionsB_interpolated[i].y - this.TransverseVectorsB_interpolated[i].y * this.Width/2;
                verticesArrayB[i*6+5] = this.PositionsB_interpolated[i].z - this.TransverseVectorsB_interpolated[i].z * this.Width/2;
            }
            verticesArrayB[this.ParticleNum_interpolated*6] = this.PositionsA_interpolated[0].x + this.TransverseVectorsA_interpolated[0].x * this.Width/2;
            verticesArrayB[this.ParticleNum_interpolated*6+1] = this.PositionsA_interpolated[0].y + this.TransverseVectorsA_interpolated[0].y * this.Width/2;
            verticesArrayB[this.ParticleNum_interpolated*6+2] = this.PositionsA_interpolated[0].z + this.TransverseVectorsA_interpolated[0].z * this.Width/2;
            verticesArrayB[this.ParticleNum_interpolated*6+3] = this.PositionsA_interpolated[0].x - this.TransverseVectorsA_interpolated[0].x * this.Width/2;
            verticesArrayB[this.ParticleNum_interpolated*6+4] = this.PositionsA_interpolated[0].y - this.TransverseVectorsA_interpolated[0].y * this.Width/2;
            verticesArrayB[this.ParticleNum_interpolated*6+5] = this.PositionsA_interpolated[0].z - this.TransverseVectorsA_interpolated[0].z * this.Width/2;

            geometryB.setAttribute('position', new THREE.BufferAttribute(verticesArrayB, 3));
        }else
        {
            for (let i = 0; i < this.ParticleNum_interpolated; i++) 
            {
                verticesArrayA[i*6] = this.PositionsA_interpolated[i].x + this.TransverseVectorsA_interpolated[i].x * this.Width/2;
                verticesArrayA[i*6+1] = this.PositionsA_interpolated[i].y + this.TransverseVectorsA_interpolated[i].y * this.Width/2;
                verticesArrayA[i*6+2] = this.PositionsA_interpolated[i].z + this.TransverseVectorsA_interpolated[i].z * this.Width/2;
                verticesArrayA[i*6+3] = this.PositionsA_interpolated[i].x - this.TransverseVectorsA_interpolated[i].x * this.Width/2;
                verticesArrayA[i*6+4] = this.PositionsA_interpolated[i].y - this.TransverseVectorsA_interpolated[i].y * this.Width/2;
                verticesArrayA[i*6+5] = this.PositionsA_interpolated[i].z - this.TransverseVectorsA_interpolated[i].z * this.Width/2;
            }
            verticesArrayA[this.ParticleNum_interpolated*6] = this.PositionsA_interpolated[0].x + this.TransverseVectorsA_interpolated[0].x * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+1] = this.PositionsA_interpolated[0].y + this.TransverseVectorsA_interpolated[0].y * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+2] = this.PositionsA_interpolated[0].z + this.TransverseVectorsA_interpolated[0].z * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+3] = this.PositionsA_interpolated[0].x - this.TransverseVectorsA_interpolated[0].x * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+4] = this.PositionsA_interpolated[0].y - this.TransverseVectorsA_interpolated[0].y * this.Width/2;
            verticesArrayA[this.ParticleNum_interpolated*6+5] = this.PositionsA_interpolated[0].z - this.TransverseVectorsA_interpolated[0].z * this.Width/2;

            //console.log('is change the vertices of meshA.');
            geometryA.setAttribute('position', new THREE.BufferAttribute(verticesArrayA, 3));

            if (geometryB)
            {
                for (let i = 0; i < this.ParticleNum_interpolated; i++) 
                {
                    verticesArrayB[i*6] = this.PositionsB_interpolated[i].x + this.TransverseVectorsB_interpolated[i].x * this.Width/2;
                    verticesArrayB[i*6+1] = this.PositionsB_interpolated[i].y + this.TransverseVectorsB_interpolated[i].y * this.Width/2;
                    verticesArrayB[i*6+2] = this.PositionsB_interpolated[i].z + this.TransverseVectorsB_interpolated[i].z * this.Width/2;
                    verticesArrayB[i*6+3] = this.PositionsB_interpolated[i].x - this.TransverseVectorsB_interpolated[i].x * this.Width/2;
                    verticesArrayB[i*6+4] = this.PositionsB_interpolated[i].y - this.TransverseVectorsB_interpolated[i].y * this.Width/2;
                    verticesArrayB[i*6+5] = this.PositionsB_interpolated[i].z - this.TransverseVectorsB_interpolated[i].z * this.Width/2;
                }
                verticesArrayB[this.ParticleNum_interpolated*6] = this.PositionsB_interpolated[0].x + this.TransverseVectorsB_interpolated[0].x * this.Width/2;
                verticesArrayB[this.ParticleNum_interpolated*6+1] = this.PositionsB_interpolated[0].y + this.TransverseVectorsB_interpolated[0].y * this.Width/2;
                verticesArrayB[this.ParticleNum_interpolated*6+2] = this.PositionsB_interpolated[0].z + this.TransverseVectorsB_interpolated[0].z * this.Width/2;
                verticesArrayB[this.ParticleNum_interpolated*6+3] = this.PositionsB_interpolated[0].x - this.TransverseVectorsB_interpolated[0].x * this.Width/2;
                verticesArrayB[this.ParticleNum_interpolated*6+4] = this.PositionsB_interpolated[0].y - this.TransverseVectorsB_interpolated[0].y * this.Width/2;
                verticesArrayB[this.ParticleNum_interpolated*6+5] = this.PositionsB_interpolated[0].z - this.TransverseVectorsB_interpolated[0].z * this.Width/2;

                geometryB.setAttribute('position', new THREE.BufferAttribute(verticesArrayB, 3));
            }
        }        
    }

    updateIndices(THREE, geometryA, geometryB)
    {
        const indicesArray = new Uint16Array(this.ParticleNum_interpolated * 6);

        for (let i = 0; i < this.ParticleNum_interpolated - 1; i++) 
        {
            indicesArray[i*6] = i * 2;
            indicesArray[i*6+1] = i * 2 + 1;
            indicesArray[i*6+2] = i * 2 + 2;
            indicesArray[i*6+3] = i * 2 + 3;
            indicesArray[i*6+4] = i * 2 + 2;
            indicesArray[i*6+5] = i * 2 + 1;
        }

        if (this.TwistNum % 2 === 0) 
        {
            indicesArray[this.ParticleNum_interpolated*6-6] = this.ParticleNum_interpolated * 2 - 2;
            indicesArray[this.ParticleNum_interpolated*6-5] = this.ParticleNum_interpolated * 2 - 1;
            indicesArray[this.ParticleNum_interpolated*6-4] = this.ParticleNum_interpolated * 2;
            indicesArray[this.ParticleNum_interpolated*6-3] = this.ParticleNum_interpolated * 2 + 1;
            indicesArray[this.ParticleNum_interpolated*6-2] = this.ParticleNum_interpolated * 2;
            indicesArray[this.ParticleNum_interpolated*6-1] = this.ParticleNum_interpolated * 2 - 1;
        } else 
        {
            indicesArray[this.ParticleNum_interpolated*6-6] = this.ParticleNum_interpolated * 2 - 2;
            indicesArray[this.ParticleNum_interpolated*6-5] = this.ParticleNum_interpolated * 2 - 1;
            indicesArray[this.ParticleNum_interpolated*6-4] = this.ParticleNum_interpolated * 2;
            indicesArray[this.ParticleNum_interpolated*6-3] = this.ParticleNum_interpolated * 2 - 2;
            indicesArray[this.ParticleNum_interpolated*6-2] = this.ParticleNum_interpolated * 2;
            indicesArray[this.ParticleNum_interpolated*6-1] = this.ParticleNum_interpolated * 2 + 1;
        }
        
        geometryA.setIndex(new THREE.BufferAttribute(indicesArray, 1));
        if (geometryB)
        {
            geometryB.setIndex(new THREE.BufferAttribute(indicesArray, 1));
        }
    }

    updateNormals(geometryA, geometryB)
    {
        geometryA.computeVertexNormals();

        const normalsA = geometryA.getAttribute('normal');
        var normalArrayA = normalsA.array;
        var normalsB = null;
        var normalArrayB = null;

        const aveNormal0 = [0, 0, 0];
        const aveNormal1 = [0, 0, 0];
        const aveNormal2 = [0, 0, 0];
        const aveNormal3 = [0, 0, 0];
        var Magnitude0;
        var Magnitude1;
        var Magnitude2;
        var Magnitude3;

        if (geometryB)
        {
            geometryB.computeVertexNormals();
            normalsB = geometryB.getAttribute('normal');
            normalArrayB = normalsB.array;
        }

        if (this.TwistNum % 2 === 0) 
        {
            aveNormal0[0] = (normalArrayA[0] + normalArrayA[2 * this.ParticleNum_interpolated * 3]) / 2;
            aveNormal0[1] = (normalArrayA[1] + normalArrayA[2 * this.ParticleNum_interpolated * 3 + 1]) / 2;
            aveNormal0[2] = (normalArrayA[2] + normalArrayA[2 * this.ParticleNum_interpolated * 3 + 2]) / 2;

            aveNormal1[0] = (normalArrayA[3] + normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3]) / 2;
            aveNormal1[1] = (normalArrayA[4] + normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + 1]) / 2;
            aveNormal1[2] = (normalArrayA[5] + normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + 2]) / 2;

            if (geometryB)
            {
                aveNormal2[0] = (normalArrayB[0] + normalArrayB[2 * this.ParticleNum_interpolated * 3]) / 2;
                aveNormal2[1] = (normalArrayB[1] + normalArrayB[2 * this.ParticleNum_interpolated * 3 + 1]) / 2;
                aveNormal2[2] = (normalArrayB[2] + normalArrayB[2 * this.ParticleNum_interpolated * 3 + 2]) / 2;

                aveNormal3[0] = (normalArrayB[3] + normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3]) / 2;
                aveNormal3[1] = (normalArrayB[4] + normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3 + 1]) / 2;
                aveNormal3[2] = (normalArrayB[5] + normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3 + 2]) / 2;
            }
        } else 
        {
            if (geometryB)
            {
                aveNormal0[0] = (normalArrayA[0] - normalArrayB[2 * this.ParticleNum_interpolated * 3]) / 2;
                aveNormal0[1] = (normalArrayA[1] - normalArrayB[2 * this.ParticleNum_interpolated * 3 + 1]) / 2;
                aveNormal0[2] = (normalArrayA[2] - normalArrayB[2 * this.ParticleNum_interpolated * 3 + 2]) / 2;

                aveNormal1[0] = (normalArrayA[3] - normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3]) / 2;
                aveNormal1[1] = (normalArrayA[4] - normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3 + 1]) / 2;
                aveNormal1[2] = (normalArrayA[5] - normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3 + 2]) / 2;

                aveNormal2[0] = (normalArrayB[0] - normalArrayA[2 * this.ParticleNum_interpolated * 3]) / 2;
                aveNormal2[1] = (normalArrayB[1] - normalArrayA[2 * this.ParticleNum_interpolated * 3 + 1]) / 2;
                aveNormal2[2] = (normalArrayB[2] - normalArrayA[2 * this.ParticleNum_interpolated * 3 + 2]) / 2;

                aveNormal3[0] = (normalArrayB[3] - normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3]) / 2;
                aveNormal3[1] = (normalArrayB[4] - normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + 1]) / 2;
                aveNormal3[2] = (normalArrayB[5] - normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + 2]) / 2;
            }else
            {
                aveNormal0[0] = (normalArrayA[0] - normalArrayA[2 * this.ParticleNum_interpolated * 3]) / 2;
                aveNormal0[1] = (normalArrayA[1] - normalArrayA[2 * this.ParticleNum_interpolated * 3 + 1]) / 2;
                aveNormal0[2] = (normalArrayA[2] - normalArrayA[2 * this.ParticleNum_interpolated * 3 + 2]) / 2;

                aveNormal1[0] = (normalArrayA[3] - normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3]) / 2;
                aveNormal1[1] = (normalArrayA[4] - normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + 1]) / 2;
                aveNormal1[2] = (normalArrayA[5] - normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + 2]) / 2;
            }
        }

        Magnitude0 = Math.sqrt(aveNormal0[0]*aveNormal0[0]+aveNormal0[1]*aveNormal0[1]+aveNormal0[2]*aveNormal0[2]);
        Magnitude1 = Math.sqrt(aveNormal1[0]*aveNormal1[0]+aveNormal1[1]*aveNormal1[1]+aveNormal1[2]*aveNormal1[2]);

        if (geometryB)
        {
            Magnitude2 = Math.sqrt(aveNormal2[0]*aveNormal2[0]+aveNormal2[1]*aveNormal2[1]+aveNormal2[2]*aveNormal2[2]);
            Magnitude3 = Math.sqrt(aveNormal3[0]*aveNormal3[0]+aveNormal3[1]*aveNormal3[1]+aveNormal3[2]*aveNormal3[2]);
        }
        
        for (let i = 0; i < 3; i++) 
        {
            if (this.TwistNum % 2 === 0)
            {
                normalArrayA[i] = aveNormal0[i]/Magnitude0;
                normalArrayA[i + 3] = aveNormal1[i]/Magnitude1;
                normalArrayA[2 * this.ParticleNum_interpolated * 3 + i] = aveNormal0[i]/Magnitude0;
                normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + i] = aveNormal1[i]/Magnitude1;

                if (geometryB)
                {
                    normalArrayB[i] = aveNormal2[i]/Magnitude2;
                    normalArrayB[i + 3] = aveNormal3[i]/Magnitude3;
                    normalArrayB[2 * this.ParticleNum_interpolated * 3 + i] = aveNormal2[i]/Magnitude2;
                    normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3 + i] = aveNormal3[i]/Magnitude3;
                }
            }else
            {
                if (geometryB)
                {
                    normalArrayA[i] = aveNormal0[i]/Magnitude0;
                    normalArrayA[i + 3] = aveNormal1[i]/Magnitude1;
                    normalArrayA[2 * this.ParticleNum_interpolated * 3 + i] = -aveNormal2[i]/Magnitude2;
                    normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + i] = -aveNormal3[i]/Magnitude3;
                    
                    normalArrayB[i] = aveNormal2[i]/Magnitude2;
                    normalArrayB[i + 3] = aveNormal3[i]/Magnitude3;
                    normalArrayB[2 * this.ParticleNum_interpolated * 3 + i] = -aveNormal0[i]/Magnitude0;
                    normalArrayB[(2 * this.ParticleNum_interpolated + 1) * 3 + i] = -aveNormal1[i]/Magnitude1;
                }else
                {
                    normalArrayA[i] = aveNormal0[i]/Magnitude0;
                    normalArrayA[i + 3] = aveNormal1[i]/Magnitude1;
                    normalArrayA[2 * this.ParticleNum_interpolated * 3 + i] = -aveNormal0[i]/Magnitude0;
                    normalArrayA[(2 * this.ParticleNum_interpolated + 1) * 3 + i] = -aveNormal1[i]/Magnitude1;
                }
            }
        }
        normalsA.needsUpdate = true;

        if (geometryB)
        {
            normalsB.needsUpdate = true;
        }
    }

    updateUVmap(THREE, geometryA, geometryB)
    {
        const uvsArray = new Float32Array((this.ParticleNum_interpolated+1)*4);
        for (let i = 0; i < (this.ParticleNum_interpolated+1)*2; i++) 
        {
            const isOuterEdge = i % 2 === 0;
            const u = isOuterEdge ? i/(this.ParticleNum_interpolated*2) : (i-1)/(this.ParticleNum_interpolated*2);
            const v = isOuterEdge ? 1.0 : 0.0;
            
            if (i<(this.ParticleNum_interpolated*2))
            {
                uvsArray[i * 2] = u;
                uvsArray[i * 2 + 1] = v;
            }else
            {
                if (this.TwistNum % 2 === 0) 
                {
                    uvsArray[i * 2] = u;
                    uvsArray[i * 2 + 1] = v;
                } else 
                {
                    uvsArray[i * 2] = u;
                    uvsArray[i * 2 + 1] = 1 - v;
                }
            }
        }
        geometryA.setAttribute('uv', new THREE.BufferAttribute(uvsArray, 2));

        if (geometryB)
        {
            geometryB.setAttribute('uv', new THREE.BufferAttribute(uvsArray, 2));
        }
    }

    createGeometry(THREE)
    {        
        const geometryA = new THREE.BufferGeometry();
        var geometryB = null;

        if (this.PositionsB)
        {
            geometryB = new THREE.BufferGeometry();
        }

        this.updateVertices(THREE, geometryA, geometryB);

        this.updateIndices(THREE, geometryA, geometryB);

        this.updateUVmap(THREE, geometryA, geometryB);

        this.updateNormals(geometryA, geometryB);

        return {A: geometryA, B: geometryB};
    }
}