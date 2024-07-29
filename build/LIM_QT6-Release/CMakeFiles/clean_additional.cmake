# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "Release")
  file(REMOVE_RECURSE
  "CMakeFiles\\QtServerTests_autogen.dir\\AutogenUsed.txt"
  "CMakeFiles\\QtServerTests_autogen.dir\\ParseCache.txt"
  "QtServerTests_autogen"
  )
endif()
