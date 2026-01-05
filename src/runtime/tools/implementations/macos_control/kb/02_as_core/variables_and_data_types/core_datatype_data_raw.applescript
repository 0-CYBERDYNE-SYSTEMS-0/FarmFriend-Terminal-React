---
id: core_datatype_data_raw
title: AppleScript Raw Data Type
description: >-
  Understanding and working with the 'data' data type in AppleScript for
  handling binary data and type information.
---
-- Create a data object using the «data» notation
set pdfSignature to «data PDF2ABCD»
set textData to «data TEXT68656C6C6F20776F726C64» -- "hello world" as TEXT data

-- Data can also be created from text using the data specifier
set hexString to "48656C6C6F" -- "Hello" in hex
set dataFromHex to data hexString

-- Working with AppleScript's automatic type conversion
set currentDate to current date
set dateAsData to currentDate as data
set classOfData to class of dateAsData -- Will be "data"

-- Creating a JPG image file header (for demonstration)
set jpgData to «data JPEG» & "FFD8FFE000104A464946000101"

-- Examining data objects
set typeCode to first word of (dateAsData as string)
set hexContents to second word of (dateAsData as string)

-- Converting Unicode text to data and back
set unicodeText to "こんにちは" as Unicode text  -- Japanese "Hello"
set unicodeAsData to unicodeText as data
set backToText to unicodeAsData as Unicode text

-- Example of data appearing in results (Script Editor would show this)
set resultSummary to "Data representations:" & return & return & ¬
  "PDF signature: " & pdfSignature & return & ¬
  "Text as data: " & textData & return & ¬
  "Data from hex: " & dataFromHex & return & ¬
  "Date as data: " & dateAsData & return & ¬
  "JPG header: " & jpgData & return & ¬
  "Type code: " & typeCode & return & ¬
  "Hex content: " & hexContents & return & ¬
  "Unicode as data: " & unicodeAsData & return & ¬
  "Converted back: " & backToText

return resultSummary
