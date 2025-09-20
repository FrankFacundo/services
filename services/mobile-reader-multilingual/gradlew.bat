@ECHO OFF

SET DIRNAME=%~dp0
IF "%DIRNAME%" == "" SET DIRNAME=.
SET APP_BASE_NAME=%~n0
SET APP_HOME=%DIRNAME%

SET DEFAULT_JVM_OPTS=

SET JAVA_EXE=
IF NOT "%JAVA_HOME%" == "" SET JAVA_EXE=%JAVA_HOME%\bin\java.exe
IF EXIST "%JAVA_EXE%" GOTO execute

SET JAVA_EXE=java.exe
WHERE %JAVA_EXE% >NUL 2>&1
IF %ERRORLEVEL% == 0 GOTO execute

ECHO ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.>&2
EXIT /B 1

:execute
SET CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
"%JAVA_EXE%" %DEFAULT_JVM_OPTS% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
