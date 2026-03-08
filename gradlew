#!/bin/sh
#
# Copyright © 2015-2021 the original authors.
#
# Gradle startup script for POSIX compatible shells
#

APP_HOME=$(cd "$(dirname "$0")" && pwd -P)
APP_NAME="Gradle"

# Resolve links
APP_HOME=$(cd "$APP_HOME" && pwd -P) || exit

DEFAULT_JVM_OPTS='"-Xmx64m" "-Xms64m"'
CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar

# Determine the Java command to use
if [ -n "$JAVA_HOME" ] ; then
    JAVA_EXE="$JAVA_HOME/bin/java"
else
    JAVA_EXE="java"
fi

exec "$JAVA_EXE" $DEFAULT_JVM_OPTS $JAVA_OPTS $GRADLE_OPTS \
  "-Dorg.gradle.appname=$APP_NAME" \
  -classpath "$CLASSPATH" \
  org.gradle.wrapper.GradleWrapperMain "$@"
