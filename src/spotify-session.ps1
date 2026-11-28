param([ValidateSet('watch','status','resume')][string]$Action='status')
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new($false)
$OutputEncoding=[Console]::OutputEncoding
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]
$null=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties,Windows.Media.Control,ContentType=WindowsRuntime]
$asTask=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function AwaitOperation($operation,$type){
 $task=$asTask.MakeGenericMethod($type).Invoke($null,@($operation))
 if(!$task.Wait(5000)){throw 'Windows media session timed out.'}
 return $task.Result
}
$manager=AwaitOperation ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
do {
 $session=$manager.GetSessions() | Where-Object {$_.SourceAppUserModelId -match '(?i)spotify'} | Select-Object -First 1
 $result=@{available=$false}
 if($session){
  $properties=AwaitOperation ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $result=@{available=$true;title=$properties.Title;artist=$properties.Artist;playing=($session.GetPlaybackInfo().PlaybackStatus.ToString() -eq 'Playing')}
  if($Action -eq 'resume'){$result.resumed=AwaitOperation ($session.TryPlayAsync()) ([bool])}
 }
 $result | ConvertTo-Json -Compress
 if($Action -eq 'watch'){Start-Sleep -Seconds 3}
}while($Action -eq 'watch')
