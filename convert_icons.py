from PIL import Image

sizes = [16, 32, 48, 128]

for size in sizes:
    img = Image.open(f'icons/icon{size}.ico')
    img.save(f'icons/icon{size}.png', 'PNG')
    print(f'Converted icon{size}.ico -> icon{size}.png')

print('All icons converted successfully!')
