import os
import time
from PIL import Image, ImageWin
import win32print 
import win32ui

SEGMENT_COUNT = 1760
DELAY_SECONDS = 100
DPI = 300
PRINTER_DPI = 180


def print_png_files(segments_folder, printer_name, delay=DELAY_SECONDS):
    while True:
        for i in range(1, SEGMENT_COUNT + 1):  # Segment 1 to 1760
            file_path = os.path.join(segments_folder, f"Segment {i}.png")

            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                continue

            image = Image.open(file_path)
            hprinter = win32print.OpenPrinter(printer_name)
            printer_info = win32print.GetPrinter(hprinter, 2)
            printable_area = printer_info['pDevMode'].PaperWidth, printer_info['pDevMode'].PaperLength

            pdc = win32ui.CreateDC()
            pdc.CreatePrinterDC(printer_name)
            pdc.StartDoc(file_path)
            pdc.StartPage()

            # Adjust image size from 300 dpi to 180 dpi scaling
            scale_factor = PRINTER_DPI / DPI
            new_width = int(image.width * scale_factor)
            new_height = int(image.height * scale_factor)
            image = image.resize((new_width, new_height))

            dib = ImageWin.Dib(image)
            dib.draw(pdc.GetHandleOutput(), (0, 0, new_width, new_height))

            pdc.EndPage()
            pdc.EndDoc()
            pdc.DeleteDC()

            print(f"Printed: {file_path}")
            time.sleep(delay)

        print("Restarting print cycle...")


if __name__ == "__main__":
    SEGMENTS_FOLDER = os.path.join(os.path.expanduser("~"), "Desktop", "receipt", "segments")
    PRINTER_NAME = "EPSON TM-T88VI Receipt6"
    print_png_files(SEGMENTS_FOLDER, PRINTER_NAME)
