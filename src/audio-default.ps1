param([ValidateSet('status','enable','restore')][string]$Action='status',[string]$Backup,[ValidateSet('steam','cable')][string]$Bridge='steam')
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[ComImport,Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IEnum { void EnumAudioEndpoints(); void GetDefaultAudioEndpoint(int flow,int role,out IDevice device); }
[ComImport,Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IDevice { void Activate(); void OpenPropertyStore(); void GetId([MarshalAs(UnmanagedType.LPWStr)]out string id); }
[ComImport,Guid("F8679F50-850A-41CF-9C72-430F290290C8"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicy {
 void GetMixFormat(); void GetDeviceFormat(); void ResetDeviceFormat(); void SetDeviceFormat();
 void GetProcessingPeriod(); void SetProcessingPeriod(); void GetShareMode(); void SetShareMode();
 void GetPropertyValue(); void SetPropertyValue(); void SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)]string id,int role);
}
public static class PadAudio {
 public static string Get(int role){var e=(IEnum)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"))); IDevice d; e.GetDefaultAudioEndpoint(1,role,out d);string id;d.GetId(out id);Marshal.ReleaseComObject(d);Marshal.ReleaseComObject(e);return id;}
 public static void Set(string id,int role){var p=(IPolicy)Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9")));p.SetDefaultEndpoint(id,role);Marshal.ReleaseComObject(p);}
}
'@
$devices=@(Get-ChildItem 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\MMDevices\Audio\Capture' | ForEach-Object {
 $props=Get-ItemProperty ($_.PSPath+'\Properties');$entry=Get-ItemProperty $_.PSPath
 $label=[string]$props.'{b3f8fa53-0004-438e-9003-51a46e139bfc},6'
 if($entry.DeviceState -eq 1 -and (($Bridge -eq 'steam' -and $label -match 'Steam Streaming Microphone') -or ($Bridge -eq 'cable' -and $props.'{a45c254e-df1c-4efd-8020-67d146a850e0},2' -eq 'CABLE Output'))) { '{0.0.1.00000000}.'+$_.PSChildName }
})
if($Action -eq 'enable') {
 if(!$devices.Count){throw 'No compatible virtual microphone is active. Enable Steam Streaming Microphone or install VB-CABLE.'}
 if(!(Test-Path -LiteralPath $Backup)) { @{previous=@(0..2 | ForEach-Object { [PadAudio]::Get($_)});target=$devices[0]} | ConvertTo-Json | Set-Content -LiteralPath $Backup -Encoding UTF8 }
 try {0..2 | ForEach-Object {[PadAudio]::Set($devices[0],$_)}} catch {
  $old=Get-Content -Raw -LiteralPath $Backup | ConvertFrom-Json
  if($old.previous){$old=$old.previous};0..2 | ForEach-Object {[PadAudio]::Set($old[$_],$_)}
  throw
 }
}
if($Action -eq 'restore' -and (Test-Path -LiteralPath $Backup)) {
 $old=Get-Content -Raw -LiteralPath $Backup | ConvertFrom-Json
 $restoreTarget=$devices[0];if($old.target){$restoreTarget=$old.target;$old=$old.previous};0..2 | ForEach-Object {if([PadAudio]::Get($_) -eq $restoreTarget){[PadAudio]::Set($old[$_],$_)}}
 Remove-Item -LiteralPath $Backup
}
@{defaults=@(0..2 | ForEach-Object {[PadAudio]::Get($_)});target=$devices;enabled=($devices.Count -gt 0 -and [PadAudio]::Get(0) -eq $devices[0])} | ConvertTo-Json -Compress
