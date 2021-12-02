from flask import Blueprint

bp = Blueprint('panels', __name__)

from app.panels import routes

#from app.errors import handlers
#import os
#APP_PATH = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
#TEMPLATE_PATH = os.path.join(APP_PATH, 'templates/')
