import { Component, OnInit, Input,ViewChild, ChangeDetectorRef, OnDestroy} from '@angular/core';
import { UiService} from '../../../qDesk/src/app/services/ui.service';
import { QuestOSService } from '../../../qDesk/src/app/services/quest-os.service';

import { NgxFileDropEntry, FileSystemFileEntry, FileSystemDirectoryEntry } from 'ngx-file-drop';

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

declare var $:any;

import swarmJson from '../swarm.json';

@Component({
  selector: 'messages-channel',
  templateUrl: './channel.component.html',
  styleUrls: ['./channel.component.scss']
})
export class ChannelComponent implements OnInit {


  @Input() channel: string;
  @ViewChild('newMessage') newMessage;

  constructor(private _sanitizer: DomSanitizer, private aChD: ChangeDetectorRef, private ui: UiService, private q: QuestOSService) {
    //parse channels
  }
  DEVMODE = swarmJson['dev'];



  noChannelSelected = "NoChannelSelected";
  channelSub;
  ngOnDestroy(){

    if(typeof this.channelSub != 'undefined'){
      this.channelSub.unsubscribe();
    }
  }

  scrollable;

  scrollBottom(){


      try{
        this.scrollable = {};
        //TODO: ADD TO UI SERVICE
        this.scrollable['nativeElement'] = window['quest-network-ui-globals']['messages-chat-scrollable'];

        if(this.scrollable['nativeElement'] != null && this.scrollable['nativeElement'].scrollTop > this.scrollable['nativeElement'].scrollHeight-$(this.scrollable['nativeElement']).height()-210){
          this.scrollable['nativeElement'].scrollTop = this.scrollable['nativeElement'].scrollHeight;
        }


      }catch(e){console.log(e)}


  }


  channelDisplayName = "NoChannelSelected";
  async ngOnInit(){

    console.log("Channel: Initializing...");

    //load channel
    console.log("Channel: Bootstrapping Channel...");
    if(this.channel != 'NoChannelSelected'){
      setTimeout( () => {
          this.scrollBottom();
      },2500);

      await this.attemptJoinChannel(this.channel);
    }

    this.channelDisplayName = await this.getChannelDisplayName(this.channel);


}


async getChannelDisplayName(cleanChannelName){
  if(cleanChannelName.indexOf('qprivatedch') > -1){
    return await this.q.os.social.getAliasFromDirectChannel2(cleanChannelName);
  }
  else{
    return cleanChannelName;
  }
}

  public showChallengeScreen = false;
  public showJoinScreen = false;
  public showInviteScreen = false;

  goToCaptcha(){
    this.showChallengeScreen = true;
    this.showJoinScreen = false;
    this.showInviteScreen = false;
  }

  goToInviteScreen(){
    this.showChallengeScreen = false;
    this.showJoinScreen = false;
    this.showInviteScreen = true;
  }

  goToJoin(){
    this.showChallengeScreen = false;
    this.showJoinScreen = true;
    this.showInviteScreen = false;
  }

  challengeFail(){
    this.showChallengeScreen = true;
    this.ui.updateProcessingStatus(false);
    this.ui.setElectronSize('0-keyimport');
    //we didn't prove that we are human when first initializing the quest
    this.ui.showSnack('Prove that you are smart', 'Please',{duration:4000});
    return false;
  }

  captchaCode;
  inviteToken;
  completedChallenge(tokenorcode){
    setTimeout( () => {
      this.ui.updateProcessingStatus(false);
    },30000);
    this.ui.updateProcessingStatus(true);

    this.q.os.ocean.dolphin.completedChallenge(this.channel, tokenorcode);
  }

  messages = [];

  handledMessages = [];

   capitalize(s){
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}


  captchaImageResource: SafeUrl;
  async handleNewMessage(pubObj){
    if(pubObj['type'] == "CHALLENGE" ){

      console.log('Received Challenge');
      if(typeof pubObj['captchaImageBuffer'] != 'undefined'){
      let imageBuffer = pubObj['captchaImageBuffer'];
      let imageB64 = Buffer.from(imageBuffer.data).toString('base64');

      this.captchaImageResource = this._sanitizer.bypassSecurityTrustUrl("data:image/png;base64,"+imageB64);
    }
      // this.showChallengeScreen = true;
      this.showJoinScreen = true;
      this.ui.updateProcessingStatus(false);
      this.aChD.detectChanges();
      // this.challengeFail()

    }
    else if(pubObj['type'] == "ownerSayHi"){
      //load chat
      this.ui.updateProcessingStatus(false);
      this.showChallengeScreen = false;
      this.showJoinScreen = false;
      this.showInviteScreen = false;
      this.aChD.detectChanges();
    }
    else if(pubObj['type'] == "CHANNEL_MESSAGE"){
      pubObj['participant'] = {};
      if(pubObj['self']){
        pubObj['reply'] = true;
      }
      else{
        pubObj['reply'] = false;
      }
      let p =  await this.getSocialProfileForChannelPubKey(pubObj['channel'],pubObj['channelPubKey']);
      if(typeof p['nick'] != 'undefined'){
          pubObj['participant']['name'] = p['nick'];
      }
      else{
        pubObj['participant']['name'] = p['alias'];
      }
      if(typeof p['key'] != 'undefined'){
        pubObj['participant']['social'] = p['key']['pubKey'];
        pubObj['participant']['isFavorite'] = this.q.os.social.profile.isFavorite(p['key']['pubKey']);
        pubObj['participant']['isRequestedFavorite'] = this.q.os.social.profile.isRequestedFavorite(p['key']['pubKey']);
      }
      else{
        pubObj['participant']['social'] = "unknown";
        pubObj['participant']['isFavorite'] = false;
        pubObj['participant']['isRequestedFavorite'] = false;
      }

      pubObj['participant']['avatar'] = "./assets/defaultAvatar.png";
//&& this.messages[this.messages.length-1]['message'].indexOf(pubObj['message']) === -1

    console.log(this.q.os.ui.getHandledMessages());
      if(this.messages.length > 0 && pubObj['channelPubKey'] == this.messages[this.messages.length-1]['channelPubKey'] && !this.q.os.utilities.inArray(this.q.os.ui.getHandledMessages(),pubObj['id'])){

          let combinator  = '\n';
          try{

            let lastMessage = this.messages[this.messages.length-1]['message'];



            let splitLastMessage = String(lastMessage).split('\n');

            if(splitLastMessage.length > 1){
              lastMessage = String(splitLastMessage[splitLastMessage.length-1]);

              if(lastMessage.trim().charAt(lastMessage.length-1) == "!" || lastMessage.trim().charAt(lastMessage.length-1) == "?" || lastMessage.trim().charAt(lastMessage.length-1) == "," || lastMessage.trim().charAt(lastMessage.length-1) == "." || lastMessage.trim().charAt(lastMessage.length-1) == ";"  )  {
                combinator = " ";
              }
              else if(lastMessage.trim().charAt(lastMessage.length-1) != ":" && lastMessage.trim().charAt(lastMessage.length-1) != "-" && lastMessage.trim().charAt(lastMessage.length-1) != ":" ){
                combinator  = '\n';
              }
            }

          }
          catch(e){console.log(e);}

          this.q.os.ui.addHandledMessage(pubObj['id']);
          this.messages[this.messages.length-1]['message'] += combinator + this.capitalize(String(pubObj['message']).trim());
      }
      else if(!this.q.os.utilities.inArray(this.q.os.ui.getHandledMessages(),pubObj['id'])){
        pubObj['message'] = this.capitalize(String(pubObj['message']).trim());
        this.messages.push(pubObj);
      }

      this.aChD.detectChanges();
    }

    return true;
  }




  async getSocialProfileForChannelPubKey(channel,chPubKey){

      return await this.q.os.social.getSocialProfileForChannelPubKey(channel,chPubKey);

  }


  async attemptJoinChannel(channel){

    this.q.os.sendBootMessage('Shaking Hands...')

    setTimeout( () => {
      this.ui.updateProcessingStatus(false);
    },20000)
    console.log('attempting to join: ',channel);
    try{
        if(!this.q.os.ocean.dolphin.isSubscribed(this.channel)){
          await this.q.os.ocean.dolphin.joinChannel(channel);
        }

        // this.ui.showSnack('Loading Channel...','All right', {duration: 2500});

        let messageHistory = this.q.os.ocean.dolphin.getChannelHistory(this.channel);
        this.DEVMODE && console.log('got history: ',messageHistory);
        for(let i = 0;i<messageHistory.length;i++){
          await this.handleNewMessage(messageHistory[i]);
        }
        this.channelSub = this.q.os.ocean.dolphin.listen(channel).subscribe( async (pubObj) => {
          await this.handleNewMessage(pubObj)
        });

        let isOwner = this.q.os.ocean.dolphin.isOwner(channel,this.q.os.ocean.dolphin.getChannelKeyChain(channel)['channelPubKey']);
        console.log('isOwner:',isOwner);
        if(isOwner){
          this.showChallengeScreen = false;
          this.showJoinScreen = false;
          this.showInviteScreen = false;
          this.ui.updateProcessingStatus(false);
        }
    }
    catch(error){
      if(error == 'reCaptcha'){
        return this.challengeFail();
      }
      else if(error == 'key invalid'){
        this.ui.showSnack('Invalid Key!','Start Over',{duration:8000});
        this.ui.delay(2000);
        //window.location.reload(;
        return false;
      }
      else{
        this.ui.showSnack('Swarm Error =(','Start Over', {duration:8000});
        console.log(error);
        await this.ui.delay(5000);
      //  window.location.reload();
        return false;
      }
    }
  }

  async publishChannelMessage(event){
    this.q.os.channel.publish(this.channel, event.message);
    this.newMessage.nativeElement.value = "";
  }



}
