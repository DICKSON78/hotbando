FROM freeradius/freeradius-server:latest

# Remove default site, add HotBando site
RUN rm -f /etc/raddb/sites-enabled/default

# Copy HotBando site config
COPY sites-available/hotbando /etc/raddb/sites-available/hotbando
RUN ln -sf /etc/raddb/sites-available/hotbando /etc/raddb/sites-enabled/hotbando

# Copy SQL module config (MySQL connection)
COPY mods-available/sql /etc/raddb/mods-available/sql
RUN ln -sf /etc/raddb/mods-available/sql /etc/raddb/mods-enabled/sql

# Copy custom SQL queries
COPY sql/mysql/queries.conf /etc/raddb/mods-config/sql/main/mysql/queries.conf

# Override radiusd.conf to set require_message_authenticator = no
COPY radiusd.conf /etc/raddb/radiusd.conf

# Copy clients config + dynamic clients include
COPY clients.conf /etc/raddb/clients.conf
COPY mikrotik.secret /etc/raddb/mikrotik.secret

# Copy dictionary
COPY dictionary.hotbando /etc/raddb/dictionary.hotbando
RUN echo '$INCLUDE dictionary.hotbando' >> /etc/raddb/dictionary

# Copy Perl authentication module config
COPY mods-available/perl /etc/raddb/mods-available/perl
RUN ln -sf /etc/raddb/mods-available/perl /etc/raddb/mods-enabled/perl

# Create Perl auth script directory and copy script
RUN mkdir -p /etc/raddb/mods-config/perl
COPY perl/hotbando_auth.pl /etc/raddb/mods-config/perl/hotbando_auth.pl

# Copy entrypoint wrapper for env var substitution
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["-f"]
