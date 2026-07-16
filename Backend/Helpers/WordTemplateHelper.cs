using DocumentFormat.OpenXml.Packaging;

using DocumentFormat.OpenXml.Wordprocessing;

using DocumentFormat.OpenXml.Drawing.Wordprocessing;

using A = DocumentFormat.OpenXml.Drawing;

using PIC = DocumentFormat.OpenXml.Drawing.Pictures;


namespace EmployeeManagementSystem.Helpers

{

    public static class WordTemplateHelper

    {

        public static void ReplacePlaceholder(string filePath, Dictionary<string, string> values)

        {

            using var document = WordprocessingDocument.Open(filePath, true);

            var body = document.MainDocumentPart!.Document.Body!;

            foreach (var text in body.Descendants<DocumentFormat.OpenXml.Wordprocessing.Text>())

            {

                foreach (var item in values)

                {

                    if (text.Text.Contains(item.Key))

                    {

                        text.Text = text.Text.Replace(item.Key, item.Value);

                    }

                }

            }

            document.MainDocumentPart.Document.Save();

        }

        public static void ReplaceSignature(

    string filePath,

    string placeholder,

    string imagePath)

        {

            // We'll implement this in the next step.

        }

    }

}
