import { loadMascotLayers } from './layers.js';
import { createMascotQuality } from './quality.js';
/** A small, local WebGL illustration rig. This is not a Live2D model/runtime. */
                          
                
                
                
                
                
                            
                             
                    
                     
                   
                 
                 
                   
                     
               
               
              
                
               
               
                
                     
                       
                            
                    
                     
                           
  

export async function createMascotRenderer(canvas                   ) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;
  const fragmentPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
    ?.precision
    ? 'highp'
    : 'mediump';
  canvas.dataset.precision = fragmentPrecision;
  const vertex = `
    attribute vec2 a_uv;
    varying ${fragmentPrecision} vec2 v_uv;
    uniform vec2 u_head;
    uniform float u_body;
    uniform float u_shoulder;
    uniform float u_nodFollow;
    uniform float u_ambient;
    uniform mediump vec3 u_mood;
    uniform float u_time;
    uniform vec3 u_secondary;
    uniform mediump vec2 u_expression;
    uniform mediump float u_layer;
    uniform vec3 u_braidLeft;
    uniform vec3 u_braidRight;
    uniform vec3 u_braidPitchLeft;
    uniform vec3 u_braidPitchRight;
    uniform float u_staffLag;

    uniform vec4 u_follow;
    uniform float u_followY;
    uniform vec4 u_cloth;
    uniform float u_clothLift;
    vec2 rotateAt(vec2 p, vec2 origin, float a) {
      p -= origin;
      return vec2(p.x*cos(a)-p.y*sin(a),p.x*sin(a)+p.y*cos(a))+origin;
    }
    float chestBreath(float y) {
      return smoothstep(540.,640.,y)*(1.-smoothstep(860.,1040.,y));
    }
    vec2 breathingAt(vec2 rest,float breath) {
      float upper=1.-smoothstep(780.,1020.,rest.y);
      float chest=chestBreath(rest.y);
      float lift=mix(.22,1.,chest)*upper;
      return vec2((rest.x-512.)*breath*.003*chest*upper,-breath*2.4*lift);
    }
    float wristCorrection(float shoulderTurn) {
      float gripWeight=1.-smoothstep(720.,1100.,792.);
      float parentTurn=u_follow.x+u_follow.w+shoulderTurn*.024*gripWeight;
      return -parentTurn*.72+u_staffLag;
    }
    vec2 posedGrip(float shoulderTurn,float breath) {
      float weight=1.-smoothstep(720.,1100.,792.);
      vec2 grip=vec2(283.,792.)+breathingAt(vec2(283.,792.),breath);
      grip=rotateAt(grip,vec2(512.,900.),shoulderTurn*.024*weight);
      grip.x+=weight*shoulderTurn*8.;
      grip.y+=weight*((283./1024.-.5)*shoulderTurn*14.-u_mood.x*4.-u_mood.z*9.);
      grip.y+=u_nodFollow*3.*(1.-smoothstep(650.,1000.,792.));
      grip=rotateAt(grip,vec2(283.,792.),u_follow.w);
      return rotateAt(grip,vec2(512.,1030.),u_follow.x)+vec2(u_follow.y,u_followY);
    }
    void main() {
      v_uv = a_uv;
      vec2 p = a_uv*vec2(1024.,1536.);
      bool staffAssembly=(u_layer>7.5&&u_layer<8.5)||(u_layer>9.5&&u_layer<10.5);
      if(u_layer>6.5&&u_layer<7.5){
        // Finger spacing belongs to the painted hand, not a polar squeeze.
        // Keep the compact, rounded silhouette intact during quiet motion.
        // A quiet shared finger hinge keeps the painted fingers together.
        // Curl only the tips; the thumb, knuckles and cuff retain their shape.
        vec2 knuckles=vec2(817.,923.);
        float fingers=smoothstep(0.,20.,dot(p-knuckles,normalize(vec2(.66,.75))));
        fingers*=smoothstep(805.,822.,p.x);
        float fingerPhase=clamp((p.x-786.)/58.,0.,1.);
        float curl=(.5-.5*cos(u_time*.85+fingerPhase*1.4))*.018*u_ambient+u_secondary.z*.009;
        p=rotateAt(p,knuckles,curl*fingers);
        // The hand trails the shoulder and loose sleeve by a few degrees.
        // Blend only across the wrist hidden by the cuff, not through the palm.
        vec2 wrist=vec2(781.,884.);
        float palm=smoothstep(-8.,18.,dot(p-wrist,normalize(vec2(.65,.76))));
        float wristAngle=.12+u_follow.z*.28+u_cloth.x*.8+sin(u_time*.85)*.012*u_ambient;
        p=mix(p,rotateAt(p,wrist,wristAngle),palm);
      }
      // The new raised collar begins beside the chin, much higher than the
      // old costume. Keep it on the chest instead of dragging it with the face.
      float neckCenter=1.-smoothstep(38.,95.,abs(p.x-512.));
      float headBoundary=mix(558.,589.,neckCenter);
      float head=(u_layer>7.5&&u_layer<9.5)?0.:1.-smoothstep(headBoundary-35.,headBoundary+16.,p.y);
      // Register painted surface keys against the CURRENT neutral render,
      // including its head seating and final viewport margin.
      float upper = 1.-smoothstep(.68,.98,a_uv.y);
      // A quiet 4.9-second breath expands/lifts the chest. Head lift stays
      // secondary, instead of translating the whole upper silhouette.
      float breath = sin(u_time*1.28)*(.4+.6*u_ambient);
      // Shallow curved head surface: cheeks recede; the nose, fringe and brim sit forward.
      // The neck blends to zero rotation, keeping the collar attached.
      float faceRegion=smoothstep(282.,382.,p.y)*(1.-smoothstep(552.,612.,p.y));
      float faceAcross=clamp((p.x-510.)/210.,-1.,1.);
      float faceCurve=sqrt(max(0.,1.-faceAcross*faceAcross));
      float depth=faceRegion*(faceCurve*58.-10.);
      float brim=exp(-pow((p.y-(315.+(p.x-510.)*.25))/60.,2.));
      depth+=brim*38.;
      // The fringe and repaired face share identical geometry at their cut edge.
      // Giving only the cutout extra depth exposed a second rim when turning right.
      float fringeRegion=exp(-pow((p.x-504.)/65.,2.)-pow((p.y-435.)/85.,2.));
      float fringeTip=smoothstep(350.,500.,p.y)*fringeRegion;
      if(u_layer<.5||(u_layer>5.5&&u_layer<6.5))depth+=12.*fringeTip;
      // One shallow projection for both eyes and cheeks. A second local
      // far-eye squeeze used to buckle the eyelid as the head changed sides.
      float yaw=u_head.x*.25,pitch=u_head.y*.11;
      p.x+=head*((p.x-510.)*(cos(yaw)-1.)+depth*sin(yaw));
      p.y+=head*((p.y-470.)*(cos(pitch)-1.)+depth*sin(pitch));
      p = mix(p,rotateAt(p,vec2(512.,620.),u_head.x*.012 + sin(u_time*.8)*.003*u_ambient + u_expression.y*.06),head);
      p.x += head*u_head.x*4.;
      p.y += head*(u_head.y*7.-breath*.35);
      // Project a shallow head volume rotating around the neck, rather than
      // translating and compressing the whole painted face. Shared surface
      // coordinates keep the fringe/hat cutouts registered at their seams.
      float nodPitch=u_secondary.z*.16;
      float neckDistance=a_uv.y*1536.-620.;
      float forwardDepth=38.+depth*.65;
      float towardCamera=-neckDistance*sin(nodPitch)+forwardDepth*(cos(nodPitch)-1.);
      float perspective=clamp(towardCamera/2500.,-.012,.036);
      p.x+=head*(a_uv.x*1024.-512.)*perspective;
      // A nod follows the turned head's local forward direction, with a tiny
      // lateral arc instead of an identical vertical squash at every yaw.
      p.x+=head*sin(yaw)*towardCamera*.18;
      p.y+=head*(neckDistance*(cos(nodPitch)-1.)+forwardDepth*sin(nodPitch));
      // Set the head a little deeper into the raised collar. The existing
      // neck weights taper this offset to zero before the chest/fastenings.
      p.y+=head*10.;
      p.y+=(1.-smoothstep(650.,1000.,a_uv.y*1536.))*u_nodFollow*3.;
      p = mix(p,rotateAt(p,vec2(512.,1370.),sin(u_time*.7)*.0008*u_ambient),upper);
      p+=breathingAt(a_uv*vec2(1024.,1536.),breath);
      // Neck, shoulders and upper chest form one connected deforming surface.
      // Hands inherit the chest motion; feet remain planted.
      float chest=1.-smoothstep(720.,1100.,a_uv.y*1536.);
      float neck=smoothstep(535.,568.,a_uv.y*1536.);
      float shoulderTurn=u_shoulder-u_body*.4;
      p=mix(p,rotateAt(p,vec2(512.,900.),shoulderTurn*.024),chest);
      p.x+=chest*shoulderTurn*8.;
      p.y+=chest*neck*((a_uv.x-.5)*shoulderTurn*14.-u_mood.x*4.-u_mood.z*6.);
      p.y-=chest*u_mood.z*3.;
      if(u_layer>2.5 && u_layer<4.5){
        float rootY=u_layer<3.5 ? 622. : 605.;
        float braidY=a_uv.y*1536.;
        float weight=clamp((braidY-rootY)/(1185.-rootY),0.,1.);
        // Hold the restored overlap at the upper braid, then blend into the swing.
        if(u_layer<3.5)weight*=smoothstep(710.,825.,braidY);
        vec3 joints=u_layer<3.5?u_braidLeft:u_braidRight;
        vec3 pitchJoints=u_layer<3.5?u_braidPitchLeft:u_braidPitchRight;
        float length=(1185.-rootY)/3.;
        // Continuous piecewise skinning: each joint contributes only below its pivot.
        vec3 spans=clamp(vec3(weight*3.)-vec3(0.,1.,2.),0.,1.);
        vec3 angles=vec3(joints.x,joints.x+joints.y,joints.x+joints.y+joints.z);
        vec3 pitchAngles=vec3(pitchJoints.x,pitchJoints.x+pitchJoints.y,pitchJoints.x+pitchJoints.y+pitchJoints.z);
        p.x+=dot(spans,sin(angles))*length;
        p.y+=dot(spans,cos(angles)-vec3(1.))*length;
        // Project front/back lag into a small vertical arc and foreshortening.
        // This motion has no horizontal pendulum component during a nod.
        float pitchDepth=dot(spans,sin(pitchAngles))*length;
        p.y+=dot(spans,cos(pitchAngles)-vec3(1.))*length+pitchDepth*.12;
        p.x+=weight*(u_head.x-u_body)*6.;
        // Pitch lag belongs in the vertical/depth motion, not the lateral
        // spring: a straight nod must not kick both braids to one side.
        p.y+=weight*(u_nodFollow-u_secondary.z)*3.;
      }
      if(u_layer>.5 && u_layer<2.5){
        vec2 capeRoot=u_layer<1.5?vec2(300.,902.):vec2(730.,886.);
        float capeAngle=(u_layer<1.5?u_cloth.z:u_cloth.w)+sin(u_time*1.28-.32)*(u_layer<1.5?-.003:.003)*u_ambient;
        float capeSpan=1328.-capeRoot.y;
        float capeWeight=clamp((a_uv.y*1536.-capeRoot.y)/capeSpan,0.,1.);
        float upperBend=smoothstep(0.,1.,capeWeight);
        p=rotateAt(p,capeRoot,capeAngle*.7*upperBend);
        // A second bend belongs below the middle fold; its hinge inherits
        // the first bend. The attachment and cream edge stay continuous.
        vec2 fold=capeRoot+vec2(u_layer<1.5?-46.:46.,capeSpan*.5);
        fold=rotateAt(fold,capeRoot,capeAngle*.35);
        p=rotateAt(p,fold,capeAngle*.3*smoothstep(.5,1.,capeWeight));
      }
      if(u_layer>4.5&&u_layer<5.5){float weight=smoothstep(740.,850.,a_uv.x*1024.);p.y+=weight*(u_secondary.x*12.+sin(u_time*1.2)*2.*u_ambient);}
      if(u_layer<.5||(u_layer>5.5&&u_layer<6.5)){
        // Keep the main fringe quiet; the little crossed tips trail the same
        // damped hair motion, with a trace of the braids' later response.
        p.x+=fringeTip*(u_secondary.x*5.+sin(u_time*1.1)*.25*u_ambient);
        p.y+=fringeTip*u_secondary.x*1.2;
        p.y+=fringeTip*(u_nodFollow-u_secondary.z)*2.5;
        vec2 rest=a_uv*vec2(1024.,1536.);
        float crossedTip=smoothstep(440.,498.,rest.y)*exp(-pow((rest.x-524.)/43.,2.)-pow((rest.y-494.)/36.,2.));
        float crossedSway=clamp(u_secondary.x*.75+(u_braidLeft.x+u_braidRight.x)*.25,-.16,.16);
        vec2 tipPose=rotateAt(p,vec2(492.,438.),crossedSway*.045);
        tipPose.x+=crossedSway*7.;
        tipPose.y+=crossedSway*1.5;
        // Apply identical weights on the underlying repair to keep the edge sealed.
        p=mix(p,tipPose,crossedTip);
      }
      if(u_layer<.5||u_layer>10.5){
        // Coat front panels hang from the waist. Keep the central straps and
        // fastenings steady; only the loose lower panels trail the cloth spring.
        vec2 clothRest=a_uv*vec2(1024.,1536.);
        float panel=smoothstep(830.,925.,clothRest.y)*(1.-smoothstep(1000.,1060.,clothRest.y));
        panel*=smoothstep(45.,75.,abs(clothRest.x-512.))*(1.-smoothstep(145.,195.,abs(clothRest.x-512.)));
        float panelSide=clothRest.x<512.?-1.:1.;
        float panelAngle=u_cloth.x*(panelSide<0.?1.:.8);
        p=rotateAt(p,vec2(512.+panelSide*95.,830.),panelAngle*panel);
        // Swing the cloth around its attachment, preserving its painted folds.
        // A horizontal per-row displacement made the skirt look stretched.
        // The tunic follows below the coat attachment, so the same painted
        // area is not pulled twice by independent coat and skirt joints.
        float hem=smoothstep(950.,1000.,a_uv.y*1536.)*(1.-smoothstep(1085.,1125.,a_uv.y*1536.));
        float cloth=hem*(1.-smoothstep(205.,245.,abs(a_uv.x*1024.-512.)));
        float skirtAngle=u_cloth.y;
        p=rotateAt(p,vec2(512.,950.),skirtAngle*cloth);
        p.y+=cloth*u_clothLift*.45;
      }
      if(u_layer>6.5&&u_layer<7.5){p=rotateAt(p,vec2(650.,790.),u_follow.z*.18+clamp(u_secondary.y*.018,-.007,.007));}
      if(staffAssembly){
        // The staff is rigid: use the gripping hand's shoulder transform for
        // every vertex instead of bending the shaft with torso skin weights.
        float gripWeight=1.-smoothstep(720.,1100.,792.);
        p=a_uv*vec2(1024.,1536.);
        // The complete reference prop is sized and registered in the artwork.
        // Never resize its head, barrel or shaft separately in the shader.
        p+=breathingAt(vec2(283.,792.),breath);
        p=rotateAt(p,vec2(512.,900.),shoulderTurn*.024*gripWeight);
        p.x+=gripWeight*shoulderTurn*8.;
        p.y+=gripWeight*((283./1024.-.5)*shoulderTurn*14.-u_mood.x*4.-u_mood.z*9.);
        p.y+=u_nodFollow*3.*(1.-smoothstep(650.,1000.,792.));
        p=rotateAt(p,vec2(283.,792.),u_follow.w);
      }
      // One shallow garment volume, shared by collar, chest, sleeves and hem.
      // The front advances along an arc while the sides recede, giving a small
      // turn in depth instead of sideways shear. Neck and leg joins taper out.
      vec2 garmentRest=a_uv*vec2(1024.,1536.);
      float garment=smoothstep(565.,640.,garmentRest.y)*(1.-smoothstep(1080.,1150.,garmentRest.y));
      if(u_layer<.5||u_layer>10.5||(u_layer>8.5&&u_layer<9.5)){
        float garmentYaw=clamp(u_body*.15+u_cloth.y*.65,-.18,.18);
        float across=clamp((garmentRest.x-512.)/225.,-1.,1.);
        float garmentDepth=48.*sqrt(max(0.,1.-across*across));
        p.x+=garment*((garmentRest.x-512.)*(cos(garmentYaw)-1.)+garmentDepth*sin(garmentYaw));
        p.y+=garment*(garmentRest.x-512.)*sin(garmentYaw)*.035;
      }
      // Reduce the parent angle itself near the pelvis. Subtracting a second
      // transformed rest pose after the fabric turn used to tug the waist.
      float pelvis=(u_layer<.5||u_layer>10.5)?smoothstep(900.,1060.,garmentRest.y)*(1.-smoothstep(1090.,1150.,garmentRest.y)):0.;
      float parentWeight=1.-pelvis*.9;
      if(u_layer<10.5){
        // Rigid parent joint: upper body, head and attached props travel together.
        p=rotateAt(p,vec2(512.,1030.),u_follow.x*parentWeight);
        p.x+=u_follow.y*parentWeight;
        p.y+=u_followY*parentWeight;
        if(staffAssembly){
          // Fist and prop share one pivot. The wrist absorbs torso rotation;
          // a bounded spring residual gives the long staff a little inertia.
          p=rotateAt(p,posedGrip(shoulderTurn,breath),wristCorrection(shoulderTurn));
        }
      }else{
        // Anchor each supporting leg on its painted ankle axis. The tall boot
        // opening is above the knee, and must never become the rotation pivot.
        // Keep one small shared rotation instead of bending the knee alone.
        vec2 rest=a_uv*vec2(1024.,1536.);
        float legX=rest.x<512.?450.:574.;
        vec2 ankle=vec2(legX,1420.);
        float lean=clamp(-u_follow.y/3200.,-.0065,.0065);
        vec2 legPose=rotateAt(rest,ankle,lean);
        // Taper only around the ankle crease; the foot and sole stay flat.
        legPose=mix(legPose,rest,smoothstep(1380.,1435.,rest.y));
        // Both waist layers share the exact parent transform while overlapping.
        vec2 skirtPose=rotateAt(p,vec2(512.,1030.),u_follow.x*parentWeight)+vec2(u_follow.y,u_followY)*parentWeight;
        // Finish the waist blend above the boot openings. Boot shafts and knees
        // belong to one supporting limb, never to the torso's fabric warp.
        p=mix(skirtPose,legPose,smoothstep(1084.,1116.,rest.y));
      }
      if(u_layer<.5){
        // Blend compensation into the existing cuff/forearm edge, tapering
        // toward the elbow. Keep the shoulder, chest and clasps anchored.
        vec2 rest=a_uv*vec2(1024.,1536.);
        float sleeve=1.-smoothstep(.35,1.,length((rest-vec2(310.,815.))/vec2(80.,75.)));
        sleeve*=1.-smoothstep(315.,390.,rest.x);
        p=mix(p,rotateAt(p,posedGrip(shoulderTurn,breath),wristCorrection(shoulderTurn)),sleeve);
      }
      vec2 position=p/vec2(1024.,1536.);
      position=(position-.5)*.94+.5;
      gl_Position=vec4(position.x*2.-1.,1.-position.y*2.,0.,1.);
    }
  `;
  const fragment = `
    precision ${fragmentPrecision} float;
    varying ${fragmentPrecision} vec2 v_uv;
    uniform sampler2D u_image;
    uniform vec3 u_surfacePose;
    uniform vec2 u_look;
    uniform vec2 u_blink;
    uniform mediump vec2 u_expression;
    uniform mediump vec3 u_mood;

    uniform float u_opacity;
    uniform vec2 u_face;
    uniform mediump float u_layer;
    uniform float u_gemTime;
    uniform float u_blush;
    float hatBandStroke(vec2 p,vec2 a,vec2 b){
      // The anime marks are straight; their arrangement supplies the perspective.
      vec2 axis=b-a;
      float along=clamp(dot(p-a,axis)/max(dot(axis,axis),.001),0.,1.);
      float distance=length(p-a-axis*along);
      float taper=mix(.30,.50,sin(along*3.14159265));
      return 1.-smoothstep(taper-.18,taper+.28,distance);
    }
    vec4 hatBandDetail(vec4 color,vec2 source){
      // Two groups of straight, uneven slashes flank the unmarked front.
      // Vary the lean as well as length: not a row of parallel bent stitches.
      // Body texture coordinates let their placement follow the existing head rig.
      vec2 p=source*.5;
      if(p.x<166.||p.x>354.||p.y<86.||p.y>135.)return color;
      if(p.x>225.&&p.x<286.)return color;
      vec3 rgb=color.rgb/max(color.a,.001);
      float khaki=smoothstep(.035,.12,rgb.r-rgb.g)*smoothstep(.09,.22,rgb.g-rgb.b);
      if(khaki<.001)return color;
      float ink=0.;
      ink=max(ink,hatBandStroke(p,vec2(172.5,105.4),vec2(171.9,108.5)));
      ink=max(ink,hatBandStroke(p,vec2(181.8,100.2),vec2(183.4,106.5)));
      ink=max(ink,hatBandStroke(p,vec2(192.4,96.3),vec2(191.6,100.8)));
      ink=max(ink,hatBandStroke(p,vec2(202.8,93.3),vec2(204.7,100.5)));
      ink=max(ink,hatBandStroke(p,vec2(212.7,91.8),vec2(215.,95.5)));
      ink=max(ink,hatBandStroke(p,vec2(222.8,90.7),vec2(221.5,97.6)));
      ink=max(ink,hatBandStroke(p,vec2(292.3,97.7),vec2(291.6,102.1)));
      ink=max(ink,hatBandStroke(p,vec2(302.1,100.9),vec2(305.9,109.9)));
      ink=max(ink,hatBandStroke(p,vec2(315.5,106.2),vec2(314.1,111.6)));
      ink=max(ink,hatBandStroke(p,vec2(328.3,112.6),vec2(332.8,119.)));
      ink=max(ink,hatBandStroke(p,vec2(339.5,119.4),vec2(341.3,126.3)));
      ink=max(ink,hatBandStroke(p,vec2(350.5,126.3),vec2(353.1,130.3)));
      color.rgb=mix(color.rgb,vec3(.32,.275,.185)*color.a,ink*khaki*.72);
      return color;
    }
    vec4 surfaceLighting(vec4 base,vec2 p){
      if(base.a<.95)return base;
      float cloth=0.,face=0.,leg=0.;
      if(u_layer<.5||u_layer>10.5){
        // Feather only INSIDE the fabric. Exclude trim, clasps, hems and
        // hand regions; lighting never replaces the current outline.
        float skirt=smoothstep(970.,995.,p.y)*(1.-smoothstep(1030.,1050.,p.y))*(1.-smoothstep(145.,185.,abs(p.x-520.)));
        float coat=smoothstep(855.,885.,p.y)*(1.-smoothstep(930.,955.,p.y));
        coat*=max(1.-smoothstep(13.,28.,abs(p.x-415.)),1.-smoothstep(13.,28.,abs(p.x-630.)));
        cloth=max(skirt,coat);
      }
      if(u_layer<.5){
        float cheek=max(1.-smoothstep(.35,1.,length((p-vec2(442.,543.))/vec2(21.,13.))),1.-smoothstep(.35,1.,length((p-vec2(589.,532.))/vec2(20.,12.))));
        face=cheek*.3;
      }
      if(u_layer>10.5){
        float inside=max(1.-smoothstep(18.,32.,abs(p.x-470.)),1.-smoothstep(18.,32.,abs(p.x-590.)));
        leg=inside*smoothstep(1125.,1160.,p.y)*(1.-smoothstep(1360.,1390.,p.y))*.32;
      }
      float mask=max(cloth,max(face,leg));
      if(mask<.001)return base;
      float turn=cloth>0.?u_surfacePose.y:(face>0.?u_surfacePose.x:u_surfacePose.z);
      // Read fold contrast from the CURRENT layer instead of parallel character images.
      // Small interior-only gain preserves painted colors, hands and silhouettes.
      if(abs(turn)<.001)return base;
      vec2 stepUv=vec2(2./1024.,0.);
      vec4 left=texture2D(u_image,v_uv-stepUv);
      vec4 right=texture2D(u_image,v_uv+stepUv);
      if(left.a<.95||right.a<.95)return base;
      float fold=clamp(dot(right.rgb-left.rgb,vec3(.299,.587,.114))*3.,-.3,.3);
      float center=leg>0.?mix(470.,590.,step(530.,p.x)):520.;
      float width=leg>0.?32.:180.;
      float plane=clamp((p.x-center)/width,-1.,1.);
      float light=clamp(turn*(plane*.035+fold*.06),-.045,.045)*mask;
      base.rgb=clamp(base.rgb*(1.+light),vec3(0.),vec3(base.a));
      return base;
    }
    float blushHatching(vec2 delta){
      float ink=0.;
      for(int i=0;i<4;i++){
        float n=float(i);
        float centerX=-15.+n*10.;
        float centerY=sin(n*1.7)*1.6;
        float halfLength=7.5+sin(n*2.+.5)*1.5;
        vec2 d=delta-vec2(centerX,centerY);
        // Slightly leaning, tapered strokes like the anime reference.
        float line=1.-smoothstep(.35,1.15,abs(d.x-d.y*.18));
        float ends=1.-smoothstep(halfLength-2.,halfLength+1.,abs(d.y));
        ink=max(ink,line*ends);
      }
      return ink;
    }
    float gemStar(vec2 delta,float radius){
      vec2 q=abs(delta)/radius;
      float rays=exp(-q.x*q.x*110.-q.y*q.y*2.5)+exp(-q.y*q.y*110.-q.x*q.x*2.5);
      return min(1.,rays);
    }
    vec3 gemLight(vec3 color,vec2 p){
      // Evaluate in the staff's texture coordinates so highlights stay attached
      // to the crystal during every hand/body transform. Preserve painted facets.
      vec2 mainGem=(p-vec2(218.,265.))/vec2(21.,46.4);
      float mask=1.-smoothstep(.7,1.,length(mainGem));
      float blue=smoothstep(.015,.13,color.b-color.r);
      float phase=u_gemTime*1.04719755;
      float sweep=exp(-pow((mainGem.x+mainGem.y*.45-sin(phase)*1.6)*5.,2.));
      float first=pow(max(0.,sin(phase-.5)),12.);
      float second=pow(max(0.,sin(phase+2.)),16.);
      float sparkle=gemStar(p-vec2(214.,247.),7.)*first
        +gemStar(p-vec2(221.,282.),5.8)*second
        +gemStar(p-vec2(232.,336.),3.5)*second*.7;
      float light=(.035+.025*sin(phase)+sweep*.18+sparkle*.8)*mask*blue;
      return mix(color,vec3(.78,.94,1.),clamp(light,0.,.9));
    }
    vec2 faceUV(vec2 p){return (p-vec2(0.,28.))/vec2(1024.,1536.);}
    vec4 eye(vec4 color,vec2 p,vec2 center,float angle,float blink) {
      vec2 delta=p-center;
      delta=vec2(delta.x*cos(angle)+delta.y*sin(angle),-delta.x*sin(angle)+delta.y*cos(angle));
      // Fringe overlaps the eye region. Every eye pass must respect the same
      // foreground hair coverage, including the lower lid during full closure.
      float blueHair=smoothstep(.01,.09,color.b-color.r);
      // The source has a blank iris with a painted grey outline. Clear that
      // entire outline before moving the iris; leaving the source underneath
      // produced a stationary second rim when looking sideways.
      float whiteMask=1.-smoothstep(.94,1.,length(delta/vec2(38.,42.)));
      whiteMask*=smoothstep(-34.,-28.,delta.y);
      // Keep the original dark upper lash and its tapered corners in front
      // of the eye fill. The grey iris guide below it is still cleared.
      float lashInk=1.-smoothstep(.22,.42,max(color.r,max(color.g,color.b)));
      float upperLash=1.-smoothstep(-10.,3.,delta.y);
      whiteMask*=1.-lashInk*upperLash;
      float closedMask=1.-smoothstep(.93,1.,length((delta-vec2(0.,-5.))/vec2(55.,45.)));
      // Original outer lashes extend beyond the oval eye opening.
      float lashRepair=1.-smoothstep(.92,1.,length((delta-vec2(0.,-14.))/vec2(72.,52.)));
      if(max(max(whiteMask,closedMask),lashRepair)<.001) return color;
      vec2 q=delta-u_look*vec2(8.,6.);
      // Latest anime close-up: luminous blue-violet to clear blue/cyan,
      // a dark oval pupil and compact, bright painted reflections.
      // All details use the moving iris coordinates and remain under the lid.
      float irisRadius=length(q/vec2(24.5,32.));
      float irisMask=1.-smoothstep(.97,1.035,irisRadius);
      // Keep the indigo cap and curved lower region, with clear colour depth
      // inside each painted region instead of the former muted flat fill.
      float lowerArc=4.+5.*(1.-pow(clamp(q.x/24.5,-1.,1.),2.));
      vec3 iris=mix(vec3(.12,.17,.42),vec3(.23,.35,.75),smoothstep(-26.,8.,q.y));
      iris=mix(iris,vec3(.23,.68,.91),smoothstep(lowerArc-1.,30.,q.y));
      float limbalRing=smoothstep(.89,1.,irisRadius);
      iris=mix(iris,vec3(.035,.055,.11),limbalRing*.90);
      float upperShade=1.-smoothstep(-24.,-8.,q.y);
      iris*=1.-upperShade*.08;
      float pupilRadius=length((q-vec2(0.,1.))/vec2(7.2,13.5));
      float pupilOutline=1.-smoothstep(.92,1.08,pupilRadius);
      float pupilFill=1.-smoothstep(.76,.88,pupilRadius);
      iris=mix(iris,vec3(.035,.065,.13),pupilOutline);
      iris=mix(iris,vec3(.105,.145,.32),pupilFill);
      float lowerReflection=1.-smoothstep(.90,1.05,length((q-vec2(0.,28.5))/vec2(13.,10.8)));
      float lowerCore=1.-smoothstep(4.8,6.,length(q-vec2(0.,32.)));
      iris=mix(iris,vec3(.43,.87,.96),lowerReflection*.92);
      iris=mix(iris,vec3(.85,.99,1.),lowerCore*.90);
      vec2 catchlight=(q-vec2(10.,-16.))/vec2(4.1,4.7);
      float shine=1.-smoothstep(.78,1.,length(catchlight));
      float reflectionHalo=(1.-smoothstep(1.,1.65,length(catchlight)))*.24;
      iris=mix(iris,vec3(.38,.65,.95),reflectionHalo);
      vec2 sideLight=abs(q-vec2(-18.,11.));
      float sideReflection=1.-smoothstep(.74,1.,max(sideLight.x/5.4,sideLight.y/2.4));
      iris=mix(iris,vec3(.96,.99,1.),max(shine,sideReflection*.94));
      vec3 sclera=vec3(.965,.966,.95)*(1.-.065*exp(-pow((delta.y+25.)/10.,2.)));
      vec3 painted=mix(sclera,iris,irisMask);
      vec3 result=mix(color.rgb,painted,whiteMask*(1.-blueHair));
      // Sweep one opaque lid over the iris and the original lash; never fade a closed eye over an open one.
      // Use the unblushed inner face for lid colour. Retain only a little of
      // the cheek variation so its rosy pigment is not copied over both eyes.
      vec2 skinPoint=center+vec2(delta.x*.55,43.+clamp(delta.y,-35.,35.)*.09);
      vec3 cheekSkin=texture2D(u_image,faceUV(skinPoint)).rgb;
      vec2 neutralPoint=vec2(516.+clamp(delta.x,-40.,40.)*.22,535.+clamp(delta.y,-35.,35.)*.06);
      vec3 neutralSkin=texture2D(u_image,faceUV(neutralPoint)).rgb;
      vec3 skin=mix(neutralSkin,cheekSkin,.12);
      float happyEye=u_face.x<.5?smoothstep(0.,.8,max(0.,u_face.y)):0.;
      float across=clamp(delta.x/38.,-1.,1.);
      float closedEdge=mix(12.+4.*(1.-across*across),-5.+13.*across*across,happyEye);
      float openEdge=-36.+16.*across*across;
      // Rest fully open, as in the user's reference. Only an actual blink or
      // smile closes the eye; there is no built-in half-closed resting offset.
      float closure=blink;
      float lidEdge=mix(openEdge,closedEdge,closure);
      float softShadow=exp(-pow((delta.y-lidEdge+5.)/10.,2.))*.035*blink;
      skin*=1.-softShadow;
      float upperCover=1.-smoothstep(lidEdge-1.,lidEdge+1.,delta.y);
      float lowerEdge=mix(39.,closedEdge-1.,blink);
      float lowerCover=smoothstep(lowerEdge-1.,lowerEdge+1.,delta.y);
      float closing=smoothstep(0.,.12,closure);
      // Remove the stationary brown lash ink before drawing the moving lash.
      // Blue fringe pixels in the same region must remain in front of the lid.
      // Keep the original painted lashes when open; clear only ink covered by
      // the moving lid, including the old outer corners when fully closed.
      // Fully replace covered skin: brightness-based ink removal left the
      // antialiased pale outline behind even when the dark core was gone.
      // Keep the transported lash active even at blink=0. Switching back to
      // the stationary source in the last 3.5% caused a visible final snap.
      result=mix(result,skin,lashRepair*(1.-blueHair)*max(upperCover*closing,lashInk*upperLash));
      result=mix(result,skin,closedMask*max(upperCover,lowerCover)*closing*(1.-blueHair));
      // The painted upper-lid crease needs its own gradual fade: the fast
      // lash cleanup used to erase/reveal it within the last 3.5% of a blink.
      // Restrict this to the light crease above the lash, away from brows/hair.
      float creaseBand=1.-smoothstep(5.,12.,abs(delta.y-(openEdge-14.)));
      creaseBand*=1.-smoothstep(29.,43.,abs(delta.x));
      creaseBand*=(1.-blueHair)*(1.-lashInk);
      float creaseVisible=1.-smoothstep(0.,.20,closure);
      result=mix(result,mix(skin,color.rgb,creaseVisible),creaseBand);
      // Transport the ORIGINAL painted upper lash through the whole blink.
      // Its tips and thickness now change continuously, rather than switching
      // from a short procedural line to the longer painted open-eye lash.
      float lashWidth=mix(1.,.80,blink);
      float lashThickness=mix(1.,.40,blink);
      float sourceX=delta.x/lashWidth;
      float sourceAcross=clamp(sourceX/38.,-1.,1.);
      float sourceEdge=-35.+16.*sourceAcross*sourceAcross;
      vec2 lashDelta=vec2(sourceX,(delta.y-lidEdge)/lashThickness+sourceEdge);
      vec2 lashPoint=center+vec2(lashDelta.x*cos(angle)-lashDelta.y*sin(angle),lashDelta.x*sin(angle)+lashDelta.y*cos(angle));
      vec3 sourceLash=texture2D(u_image,faceUV(lashPoint)).rgb;
      float movingInk=1.-smoothstep(.22,.42,max(sourceLash.r,max(sourceLash.g,sourceLash.b)));
      movingInk*=1.-smoothstep(-10.,3.,lashDelta.y);
      movingInk*=smoothstep(-65.,-55.,lashDelta.y)*(1.-smoothstep(58.,70.,abs(sourceX)));
      movingInk*=1.-smoothstep(.01,.09,sourceLash.b-sourceLash.r);
      result=mix(result,sourceLash,movingInk*(1.-blueHair));
      // A short, fine lower-lid edge frames the open eye without an unbroken
      // black oval or an extra line lingering through a blink.
      float lowerLid=1.-smoothstep(.45,1.15,abs(delta.y-(37.-7.*across*across)));
      lowerLid*=1.-smoothstep(22.,33.,abs(delta.x));
      lowerLid*=1.-smoothstep(.08,.45,blink);
      result=mix(result,vec3(.28,.23,.25),lowerLid*.32*(1.-blueHair));
      return vec4(result,color.a);
    }
    void main() {
      vec2 p=v_uv*vec2(1024.,1536.);
      if(u_face.y<0.){
        vec4 layerColor=texture2D(u_image,v_uv);if(layerColor.a<.01)discard;
        layerColor=surfaceLighting(layerColor,p);
        if(u_layer>7.5&&u_layer<8.5)layerColor.rgb=gemLight(layerColor.rgb/layerColor.a,p)*layerColor.a;
        gl_FragColor=layerColor*u_opacity;return;
      }
      p.y+=28.; // Register the new costume art to the existing facial rig.
      // Warp the existing painted mouth locally; keep the original skin shading.
      vec2 mouth=p-vec2(516.,571.);
      float mouthMask=1.-smoothstep(.45,1.,length(mouth/vec2(38.,22.)));
      vec2 sampleP=p;
      sampleP.x-=mouth.x*u_expression.x*.12*mouthMask;
      sampleP.y+=u_expression.x*mouthMask*(pow(clamp(abs(mouth.x)/22.,0.,1.),2.)*6.-1.);
      // Move the painted eyebrows locally; feathering preserves adjacent skin and hair.
      float browL=1.-smoothstep(.45,1.,length((p-vec2(423.,424.))/vec2(39.,17.)));
      float browR=1.-smoothstep(.45,1.,length((p-vec2(597.,409.))/vec2(37.,17.)));
      sampleP.y+=browL*(u_mood.y*5.+u_mood.z*6.+u_mood.x*2.);
      sampleP.y+=browR*(-u_mood.y*2.+u_mood.z*6.+u_mood.x*2.);
      vec4 color=texture2D(u_image,faceUV(sampleP));
      // A narrow brim shadow joins the original hair to the hat. Preserve the
      // registered line art and skin; only blue hair beneath the brim is shaded.
      float hairMask=smoothstep(.035,.12,color.b-color.r);
      float brimDistance=sampleP.y-28.-(315.+(sampleP.x-510.)*.25);
      float brimShade=smoothstep(0.,15.,brimDistance)*(1.-smoothstep(44.,76.,brimDistance));
      color.rgb*=1.-hairMask*brimShade*.13;
      color=surfaceLighting(color,v_uv*vec2(1024.,1536.));
      color=hatBandDetail(color,sampleP-vec2(0.,28.));
      if(color.a<.01)discard;
      if(u_face.y<0.){gl_FragColor=color;return;}
      // Every reaction keeps the same face and continuous eyelid rig; no atlas swap.
      float smileClosure=u_face.x<.5?smoothstep(0.,1.,max(0.,u_face.y)):u_mood.y*.12;
      color=eye(color,p,vec2(433.,511.),-.122,max(u_blink.x,smileClosure));
      color=eye(color,p,vec2(592.,496.),.157,max(u_blink.y,smileClosure));
      // Broad muted warmth and fine cheek hatching follow the anime reference.
      // Keep the upper edge below the eyelids and soften it toward the jaw.
      vec2 blushL=p-vec2(419.,566.),blushR=p-vec2(610.,551.);
      vec2 cheekL=blushL/vec2(35.,21.),cheekR=blushR/vec2(33.,20.);
      float belowLeft=smoothstep(547.,557.,p.y),belowRight=smoothstep(532.,542.,p.y);
      float cheek=exp(-dot(cheekL,cheekL)*1.5)*belowLeft
        +exp(-dot(cheekR,cheekR)*1.5)*belowRight;
      float skin=1.-smoothstep(.01,.10,color.b-color.r);
      color.rgb=mix(color.rgb,vec3(.89,.46,.43)*color.a,clamp(cheek*u_blush*.39*skin,0.,.39));
      float hatch=blushHatching(blushL)*belowLeft+blushHatching(blushR+vec2(1.,1.))*belowRight;
      color.rgb=mix(color.rgb,vec3(.65,.34,.30)*color.a,clamp(hatch*smoothstep(.1,.9,u_blush)*.23*skin,0.,.23));
      // Optional nose-tip trial: one faint warm curve, kept separate from the
      // source artwork so it can be removed without altering the painted face.
      vec2 nose=(p-vec2(516.,545.))/1.3;
      float noseCurve=1.8-.10*nose.x*nose.x;
      float noseLine=(1.-smoothstep(.7,1.8,abs(nose.y-noseCurve)))
        *(1.-smoothstep(2.5,5.,abs(nose.x)));
      float noseShade=exp(-dot(nose/vec2(6.,3.5),nose/vec2(6.,3.5))*1.8);
      color.rgb=mix(color.rgb,vec3(.64,.40,.33)*color.a,(noseLine*.47+noseShade*.085)*skin);
      gl_FragColor=color;
    }
  `;
  function compile(kind        , source        ) {
    const shader = gl .createShader(kind) ;
    gl .shaderSource(shader, source);
    gl .compileShader(shader);
    if (!gl .getShaderParameter(shader, gl .COMPILE_STATUS)) {
      gl .deleteShader(shader);
      throw new Error('Mascot shader compilation failed');
    }
    return shader;
  }
  let program                      = null;
  let buffer                     = null;
  const quality = createMascotQuality();
  const viewportLimits = gl.getParameter(gl.MAX_VIEWPORT_DIMS)              ;
  const maxRenderWidth = Math.min(1024, viewportLimits[0], Math.floor(viewportLimits[1] / 1.5));
  let displayWidth = canvas.clientWidth || 188;
  let repaint                      = null;
  const refreshSize = () => {
    displayWidth = canvas.clientWidth || 188;
    repaint?.();
  };
  const resize = new ResizeObserver(refreshSize);
  resize.observe(canvas);
  // Browser zoom/DPR changes can leave CSS dimensions unchanged. Refresh
  // even while reduced motion has stopped the animation loop.
  window.addEventListener('resize', refreshSize, { passive: true });
  window.visualViewport?.addEventListener('resize', refreshSize, { passive: true });
  const layerTextures                 = [];

  const shaders                = [];
  const dispose = () => {
    resize.disconnect();
    window.removeEventListener('resize', refreshSize);
    window.visualViewport?.removeEventListener('resize', refreshSize);
    repaint = null;
    layerTextures.forEach((t) => gl.deleteTexture(t));
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  try {
    program = gl.createProgram() ;
    shaders.push(compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment));
    shaders.forEach((shader) => gl.attachShader(program , shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error('Mascot shader linking failed');
    const layers = await loadMascotLayers(canvas.dataset.layers );
    gl.useProgram(program);
    const bounds = layers.map((layer) => {
      const { width, height } = layer,
        data = layer.getContext('2d') .getImageData(0, 0, width, height).data;
      let left = width,
        top = height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          if (data[(y * width + x) * 4 + 3] > 0) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x + 1);
            bottom = Math.max(bottom, y + 1);
          }
      return {
        left: left / width,
        top: top / height,
        right: right / width,
        bottom: bottom / height,
      };
    });
    const vertices           = [];
    const meshes = [
      { x: 40, y: 64 },
      { x: 24, y: 36 },
    ].map((cells) =>
      bounds.map((bound, index) => {
        const first = vertices.length / 2;
        // Add actual joint/overlap rows: a knee blended across one large triangle
        // looked angular even when its animation was sampled at display refresh.
        const rows = Array.from({ length: cells.y + 1 }, (_, i) => i / cells.y);
        const columns = Array.from({ length: cells.x + 1 }, (_, i) => i / cells.x);
        if (index === 7) {
          for (let y = 870; y <= 980; y += 2) rows.push(y / 1536);
          for (let x = 760; x <= 875; x += 2) columns.push(x / 1024);
        }
        if ([0, 3, 4, 5, 6].includes(index))
          rows.push(...[543, 560, 568, 580, 595, 610, 628, 650, 690, 720].map((y) => y / 1536));
        if (index === 3)
          rows.push(...[724, 738, 752, 766, 780, 794, 808, 815].map((y) => y / 1536));
        if (index === 0 || index === 11)
          rows.push(
            ...[
              1020, 1084, 1090, 1120, 1150, 1171, 1185, 1199, 1260, 1275, 1290, 1320, 1360, 1380,
              1400, 1420, 1435, 1440,
            ].map((y) => y / 1536),
          );
        const ys = [...new Set(rows)].sort((a, b) => a - b);
        const xs = [...new Set(columns)].sort((a, b) => a - b);
        for (let y = 0; y < ys.length - 1; y++) {
          if (ys[y + 1] < bound.top - 1 / cells.y || ys[y] > bound.bottom + 1 / cells.y) continue;
          for (let x = 0; x < xs.length - 1; x++) {
            if (xs[x + 1] < bound.left - 1 / cells.x || xs[x] > bound.right + 1 / cells.x) continue;
            const x0 = xs[x],
              x1 = xs[x + 1],
              y0 = ys[y],
              y1 = ys[y + 1];
            vertices.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
          }
        }
        return { first, count: vertices.length / 2 - first };
      }),
    );
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const upload = (source                ) => {
      const value = gl.createTexture() ;
      gl.bindTexture(gl.TEXTURE_2D, value);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return value;
    };
    layerTextures.push(...layers.map(upload));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const uniforms = Object.fromEntries(
      [
        'u_head',
        'u_body',
        'u_nodFollow',
        'u_ambient',
        'u_shoulder',
        'u_mood',
        'u_time',
        'u_gemTime',
        'u_blush',
        'u_look',
        'u_blink',
        'u_secondary',
        'u_expression',
        'u_layer',
        'u_image',
        'u_face',
        'u_braidLeft',
        'u_braidRight',
        'u_braidPitchLeft',
        'u_braidPitchRight',
        'u_staffLag',
        'u_opacity',
        'u_follow',
        'u_followY',
        'u_cloth',
        'u_clothLift',
      ].map((key) => [key, gl.getUniformLocation(program , key)]),
    );
    const surfacePose = gl.getUniformLocation(program, 'u_surfacePose');
    canvas.dataset.surfaceSource = 'current-layers';
    let lastPose                    = null;
    repaint = () => {
      if (lastPose) render(lastPose);
    };
    function render(pose            ) {
      lastPose = pose;
      const viewportScale = window.visualViewport?.scale || 1;
      const density = Math.max(1, Math.min(devicePixelRatio * viewportScale, 6) * quality.scale);
      const width = Math.max(1, Math.min(maxRenderWidth, Math.round(displayWidth * density)));
      const height = Math.round(width * 1.5);
      canvas.dataset.renderDensity = (width / displayWidth).toFixed(2);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl .viewport(0, 0, width, height);
      gl .clearColor(0, 0, 0, 0);
      gl .clear(gl .COLOR_BUFFER_BIT);
      gl .uniform2f(uniforms.u_head, pose.headX, pose.headY);
      gl .uniform1f(uniforms.u_body, pose.bodyX);
      gl .uniform1f(uniforms.u_shoulder, pose.shoulder ?? 0);
      gl .uniform1f(uniforms.u_nodFollow, pose.nodFollow ?? 0);
      gl .uniform1f(uniforms.u_ambient, pose.ambient ?? 1);
      gl .uniform3f(uniforms.u_mood, pose.happy ?? 0, pose.curious ?? 0, pose.surprised ?? 0);
      const follow = pose.bodyMotion;
      gl .uniform4f(
        uniforms.u_follow,
        follow?.[0] ?? 0,
        follow?.[1] ?? 0,
        follow?.[2] ?? 0,
        follow?.[3] ?? 0,
      );
      gl .uniform1f(uniforms.u_followY, follow?.[4] ?? 0);
      const cloth = pose.clothMotion;
      gl .uniform4f(
        uniforms.u_cloth,
        cloth?.[0] ?? 0,
        cloth?.[1] ?? 0,
        cloth?.[2] ?? 0,
        cloth?.[3] ?? 0,
      );
      gl .uniform1f(uniforms.u_clothLift, cloth?.[4] ?? 0);
      gl .uniform1f(uniforms.u_time, pose.time);
      gl .uniform2f(uniforms.u_look, pose.lookX, pose.lookY);
      gl .uniform2f(uniforms.u_blink, pose.blink, pose.blinkRight);
      gl .uniform1f(uniforms.u_gemTime, pose.time % 6);
      gl .uniform1f(uniforms.u_blush, pose.blush ?? 0);
      gl .uniform3fv(uniforms.u_braidLeft, pose.braids.subarray(0, 3));
      gl .uniform3fv(uniforms.u_braidRight, pose.braids.subarray(3, 6));
      const pitch = pose.braidPitch;
      gl .uniform3f(uniforms.u_braidPitchLeft, pitch?.[0] ?? 0, pitch?.[1] ?? 0, pitch?.[2] ?? 0);
      gl .uniform3f(uniforms.u_braidPitchRight, pitch?.[3] ?? 0, pitch?.[4] ?? 0, pitch?.[5] ?? 0);
      gl .uniform1f(uniforms.u_staffLag, pose.staffLag ?? 0);
      gl .uniform3f(uniforms.u_secondary, pose.hair, pose.cape, pose.nod);
      gl .uniform2f(uniforms.u_expression, pose.smile, pose.tilt);
      gl .uniform3f(
        surfacePose,
        pose.headX,
        pose.bodyX,
        Math.max(-1, Math.min(1, (follow?.[1] ?? 0) / 24)),
      );
      gl .activeTexture(gl .TEXTURE0);
      gl .uniform1i(uniforms.u_image, 0);
      const mesh = meshes[quality.coarse ? 1 : 0];
      canvas.dataset.quality = ['light', 'balanced', 'high'][quality.level];
      canvas.dataset.vertices = String(mesh.reduce((sum, part) => sum + part.count, 0));
      // Body and hair sit behind the rod, with the curled fingers in front.
      [11, 0, 1, 2, 9, 3, 4, 5, 6, 7, 8, 10].forEach((index) => {
        const layer = layerTextures[index];
        const opacity = 1;
        if (opacity < 0.002) return;
        gl .bindTexture(gl .TEXTURE_2D, layer);
        gl .uniform1f(uniforms.u_layer, index);
        gl .uniform1f(uniforms.u_opacity, opacity);
        gl .uniform2f(uniforms.u_face, pose.expression, index === 0 ? pose.expressionWeight : -1);
        gl .drawArrays(gl .TRIANGLES, mesh[index].first, mesh[index].count);
      });
    }
    return { render, dispose, layerCount: layerTextures.length, observeFrame: quality.observe };
  } catch {
    dispose();
    return null;
  }
}
