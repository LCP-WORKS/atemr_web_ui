from flask import render_template, redirect, url_for, flash, request
from werkzeug.urls import url_parse
from flask_login import login_user, logout_user, current_user
from app import db
from app.auth import bp
from app.auth.forms import LoginForm, RegistrationForm, ResetPasswordForm
from app.models import User
from flask_login import current_user, login_required


@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('panels.control'))
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user is None or not user.check_password(form.password.data):
            flash('Invalid username or password')
            return redirect(url_for('auth.login'))
        if(user.has_access == 1):
            login_user(user, remember=form.remember_me.data)
        else:
            flash('Permission denied !!')
            return redirect(url_for('auth.noaccess'))
        next_page = request.args.get('next')
        if not next_page or url_parse(next_page).netloc != '':
            next_page = url_for('panels.control')
        return redirect(next_page)
    return render_template('auth/login.html', title='Sign In', form=form)


@bp.route('/noaccess', methods=['GET'])
def noaccess():
    return render_template('auth/noaccess.html', title='No Access')

@bp.route('/logout')
def logout():
    logout_user()
    return redirect(url_for('auth.login'))


@bp.route('/register', methods=['GET', 'POST'])
def register():
    if ((current_user.is_authenticated) and (current_user.username != 'admin')):
        return redirect(url_for('panels.control'))
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User(username=form.username.data)
        user.set_password(form.password.data)
        db.session.add(user)
        db.session.commit()
        flash('Congratulations, you are now a registered user!')
        return redirect(url_for('auth.login'))
    return render_template('auth/register.html', title='Register',
                           form=form)

@bp.route('/manageusers', methods=['GET', 'POST'])
@login_required
def manageusers():
    if ((current_user.is_authenticated) and (current_user.username != 'admin')):
        return redirect(url_for('panels.control'))
    users = User.query.all()
    return render_template('auth/manageusers.html', title='ManageUsers', users=users)

@bp.route('/user/<username>', methods=['GET', 'POST'])
@login_required
def user(username):
    user = User.query.filter_by(username=username).first_or_404()
    form = ResetPasswordForm()
    if(form.validate_on_submit()):
        user.set_password(form.password2.data)
        db.session.commit()
        flash('Password changed successfully!')
        return redirect(url_for('panels.settings'))
    return render_template('main/user.html', title='User', user=user, form=form)

@bp.route('/removeuser/<username>', methods=['GET'])
@login_required
def removeuser(username):
    user = User.query.filter_by(username=username).first_or_404()
    #write logic to remove user here
    if(username != 'admin'):
        db.session.delete(user)
        db.session.commit()
        flash('User removed successfully!')
    else:
        flash('Illegal operation denied!')
    return redirect(url_for('auth.manageusers'))

@bp.route('/grantaccess/<username>', methods=['GET'])
@login_required
def grantaccess(username):
    if((current_user.role == 1) and (username != 'admin')):
        user = User.query.filter_by(username=username).first_or_404()
        if(user.has_access == 1):
            user.set_access(0)
            db.session.commit()
            flash('Access Removed!')  
        else:
            user.set_access(1)
            db.session.commit()
            flash('Access Granted!')
    return redirect(url_for('auth.manageusers'))

@bp.route('/grantrole/<username>', methods=['GET'])
@login_required
def grantrole(username):
    if((current_user.role == 1) and (username != 'admin')):
        user = User.query.filter_by(username=username).first_or_404()
        if(user.role == 1):
            user.set_role(0)
            db.session.commit()
            flash('%s has administrator rights removed!' % username)  
        else:
            user.set_role(1)
            db.session.commit()
            flash('%s has administrator rights added!' % username)
    return redirect(url_for('auth.manageusers'))

@bp.route('/reset_password_request', methods=['GET', 'POST'])
def reset_password_request():
    pass


@bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    pass
