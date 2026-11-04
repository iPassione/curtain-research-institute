param([string]$Root='D:\CurtainDrawingTools',[string]$NpmPath)
$ErrorActionPreference='Stop'
$Root=[IO.Path]::GetFullPath($Root)
if([IO.Path]::GetPathRoot($Root) -ne 'D:\'){throw 'Drawing projects, dependencies and cache must be on D:.'}
$lock=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'projects.lock.json') -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force $Root | Out-Null
foreach($repo in $lock.repositories){
  $target=Join-Path $Root $repo.name
  if(Test-Path -LiteralPath $target){
    $remote=git -C $target remote get-url origin
    if($LASTEXITCODE -ne 0 -or $remote -ne $repo.url){throw "Unexpected checkout: $target"}
    $dirty=git -C $target status --porcelain
    if($dirty){throw "Keep local changes before restoring: $target"}
  }else{
    git clone --depth 1 --filter=blob:none --sparse $repo.url $target
    if($LASTEXITCODE -ne 0){throw "Clone failed: $($repo.name)"}
  }
  if($repo.sparse){git -C $target sparse-checkout set @($repo.sparse)}else{git -C $target sparse-checkout disable}
  if($LASTEXITCODE -ne 0){throw 'Sparse checkout failed'}
  git -C $target fetch --depth 1 origin $repo.commit
  if($LASTEXITCODE -ne 0){throw "Cannot fetch pinned commit: $($repo.name)"}
  git -C $target checkout --detach $repo.commit
  if($LASTEXITCODE -ne 0){throw 'Checkout failed'}
}
$runtime=Join-Path $Root 'runtime'
New-Item -ItemType Directory -Force $runtime | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'package.json'),(Join-Path $PSScriptRoot 'package-lock.json') -Destination $runtime
if(!$NpmPath){$cmd=Get-Command npm.cmd -ErrorAction SilentlyContinue;if($cmd){$NpmPath=$cmd.Source}}
if(!$NpmPath){throw 'Pass -NpmPath with the absolute path to npm.cmd. The source projects have already been restored.'}
& $NpmPath ci --prefix $runtime --cache (Join-Path $Root 'npm-cache') --ignore-scripts --no-audit --no-fund
if($LASTEXITCODE -ne 0){throw 'Dependency installation failed'}
Write-Output "Drawing tools restored to $Root"
